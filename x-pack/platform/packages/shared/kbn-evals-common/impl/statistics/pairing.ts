/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean } from '@elastic/statistics';
import type { Direction, EvaluationScoreDocument } from '../schemas/common_attributes.gen';
import type {
  ComparisonSide,
  CompareExperimentsResponse,
  RepetitionPolicy,
} from '../schemas/experiments/compare_experiments_route.gen';

export type { Direction };

type SideRepetitions = Omit<ComparisonSide, 'mean'>;

export interface RepetitionStats {
  target: SideRepetitions;
  baseline: SideRepetitions;
  repetitionWarning: boolean;
}

type RejectedSlice = NonNullable<CompareExperimentsResponse['pairing']['rejectedSlices']>[number];

export interface PairedScore {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  scoreTarget: number;
  scoreBaseline: number;
  direction?: Direction;
}

/**
 * Legacy name→polarity heuristic used before `evaluator.direction` was persisted.
 * Kept only as a fallback for historical score docs that omit the field.
 */
const LOWER_IS_BETTER_NAME_PATTERN = /\b(tokens?|latency|costs?|duration|time|errors?)\b/i;

function resolveDirectionFromEvaluatorName(evaluatorName: string): Direction {
  return LOWER_IS_BETTER_NAME_PATTERN.test(evaluatorName) ? 'minimize' : 'maximize';
}

/**
 * Resolve metric polarity for a paired baseline/target comparison of the same evaluator.
 * - Both missing: legacy name-based heuristic (backward compatible with pre-metadata scores)
 * - Only one side defined: use that side
 * - Both defined: prefer target
 */
export function resolveDirection(
  targetDirection: Direction | undefined,
  baselineDirection: Direction | undefined,
  evaluatorName: string
): Direction {
  if (targetDirection !== undefined) {
    return targetDirection;
  }
  if (baselineDirection !== undefined) {
    return baselineDirection;
  }
  return resolveDirectionFromEvaluatorName(evaluatorName);
}

export function isImproved(diff: number, direction: Direction): boolean {
  if (direction === 'neutral') return false;
  return direction === 'maximize' ? diff > 0 : diff < 0;
}

export function buildSliceKey(datasetId: string, evaluatorName: string): string {
  return `${datasetId}|${evaluatorName}`;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

interface SideScores {
  values: number[];
  missing: number;
  direction?: Direction;
}

interface ExampleScores {
  first: EvaluationScoreDocument;
  sliceKey: string;
  target: SideScores;
  baseline: SideScores;
}

function groupByExample(
  targetScores: EvaluationScoreDocument[],
  baselineScores: EvaluationScoreDocument[]
): ExampleScores[] {
  const examples = new Map<string, ExampleScores>();
  const add = (score: EvaluationScoreDocument, side: 'target' | 'baseline') => {
    const key = [score.example.dataset.id, score.example.id, score.evaluator.name].join('\0');
    let example = examples.get(key);
    if (!example) {
      example = {
        first: score,
        sliceKey: buildSliceKey(score.example.dataset.id, score.evaluator.name),
        target: { values: [], missing: 0 },
        baseline: { values: [], missing: 0 },
      };
      examples.set(key, example);
    }
    const scores = example[side];
    if (isFiniteNumber(score.evaluator.score)) {
      scores.values.push(score.evaluator.score);
    } else {
      scores.missing += 1;
    }
    scores.direction ??= score.evaluator.direction;
  };
  targetScores.forEach((score) => add(score, 'target'));
  baselineScores.forEach((score) => add(score, 'baseline'));
  return [...examples.values()];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sampleStandardDeviation(values: number[]): number {
  const average = mean(values);
  const squares = values.reduce((sum, value) => sum + (value - average) ** 2, 0);
  return Math.sqrt(squares / (values.length - 1));
}

function stability(sides: SideScores[]): number | null {
  const deviations = sides
    .filter((side) => side.values.length > 1)
    .map((side) => sampleStandardDeviation(side.values));
  return deviations.length > 0 ? mean(deviations) : null;
}

const isPaired = ({ target, baseline }: ExampleScores) =>
  target.values.length > 0 && baseline.values.length > 0;

function summarizeSlice(examples: ExampleScores[]): RepetitionStats {
  const paired = examples.filter(isPaired);
  const summarizeSide = (side: 'target' | 'baseline'): SideRepetitions => ({
    used: examples.reduce((total, example) => total + example[side].values.length, 0),
    missing: examples.reduce((total, example) => total + example[side].missing, 0),
    stability: stability(paired.map((example) => example[side])),
  });
  return {
    target: summarizeSide('target'),
    baseline: summarizeSide('baseline'),
    repetitionWarning: examples.some(
      ({ target, baseline }) =>
        target.values.length !== baseline.values.length ||
        target.missing > 0 ||
        baseline.missing > 0
    ),
  };
}

function summarizeRepetitions(examples: ExampleScores[]): Map<string, RepetitionStats> {
  const slices = new Map<string, ExampleScores[]>();
  for (const example of examples) {
    const slice = slices.get(example.sliceKey);
    if (slice) {
      slice.push(example);
    } else {
      slices.set(example.sliceKey, [example]);
    }
  }
  return new Map([...slices].map(([key, sliceExamples]) => [key, summarizeSlice(sliceExamples)]));
}

function pairByExample(examples: ExampleScores[], policy: RepetitionPolicy) {
  const aggregate = policy === 'median' ? median : mean;
  const outsideUnitInterval = new Set(
    (policy === 'median' ? examples : [])
      .filter(({ target, baseline }) =>
        [...target.values, ...baseline.values].some((value) => value < 0 || value > 1)
      )
      .map(({ sliceKey }) => sliceKey)
  );

  const pairs: PairedScore[] = [];
  const rejectedSlices = new Map<string, RejectedSlice>();
  let skippedMissingPairs = 0;
  let skippedNullScores = 0;

  for (const example of examples) {
    const { first, target, baseline } = example;
    skippedNullScores += target.missing + baseline.missing;

    if (isPaired(example)) {
      if (outsideUnitInterval.has(example.sliceKey)) {
        rejectedSlices.set(example.sliceKey, {
          datasetName: first.example.dataset.name,
          evaluatorName: first.evaluator.name,
        });
      } else {
        pairs.push({
          datasetId: first.example.dataset.id,
          datasetName: first.example.dataset.name,
          evaluatorName: first.evaluator.name,
          scoreTarget: aggregate(target.values),
          scoreBaseline: aggregate(baseline.values),
          direction: resolveDirection(target.direction, baseline.direction, first.evaluator.name),
        });
      }
    } else if (target.values.length > 0 || (target.missing === 0 && baseline.values.length > 0)) {
      // A target with only null scores counts as null and not as unpaired, as it did before
      // repetitions were aggregated.
      skippedMissingPairs += 1;
    }
  }

  return {
    pairs,
    skippedMissingPairs,
    skippedNullScores,
    rejectedSlices: [...rejectedSlices.values()],
  };
}

/**
 * Pair target scores against baseline scores per (dataset, example, evaluator). The policy
 * reduces each side's valid repetitions to one score per example.
 */
export function pairScores(
  targetScores: EvaluationScoreDocument[],
  baselineScores: EvaluationScoreDocument[],
  policy: RepetitionPolicy
): {
  pairs: PairedScore[];
  skippedMissingPairs: number;
  skippedNullScores: number;
  rejectedSlices: RejectedSlice[];
  repetitions: Map<string, RepetitionStats>;
} {
  const examples = groupByExample(targetScores, baselineScores);
  return { ...pairByExample(examples, policy), repetitions: summarizeRepetitions(examples) };
}
