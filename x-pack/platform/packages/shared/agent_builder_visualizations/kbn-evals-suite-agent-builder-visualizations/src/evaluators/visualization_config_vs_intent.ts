/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';
import {
  extractGoldQuery,
  hasStructuralGoldConfig,
  type VisualizationGoldConfig,
} from './gold_visualization_config';
import { columnsReferToSameExpression } from './resolve_esql_column';

export const VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME = 'Visualization Config vs Intent';

const SCATTER_MARKS = new Set(['point', 'circle']);
const SKIP_KEYS = new Set(['data_source']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * CODE evaluator: subset-matches gold Config API against the generated
 * visualization. Extra actual fields, titles, styling, and column alias wording
 * are ignored. New gold keys are scored automatically.
 */
export function createVisualizationConfigVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedConfigExtractor: (expected: TExample['output']) => VisualizationGoldConfig | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedConfigExtractor,
    name = VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const goldConfig = expectedConfigExtractor(expected);
      if (!goldConfig || !hasStructuralGoldConfig(goldConfig)) {
        return {
          score: 1,
          label: 'skipped',
          explanation: 'No structural gold config declared for this example.',
        };
      }

      let visualizations: ExtractedVisualization[];
      try {
        visualizations = visualizationExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Visualization extractor threw: ${(err as Error).message}`,
        };
      }

      if (visualizations.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No visualization produced to compare against the gold config.',
        };
      }

      const goldQuery = extractGoldQuery(expected);
      const details = visualizations.map((visualization, index) => {
        const mismatches: string[] = [];
        matchValue(
          goldConfig,
          actualConfig(visualization),
          '',
          goldQuery,
          visualization.esql,
          mismatches
        );
        return {
          index,
          matched: mismatches.length === 0,
          mismatches,
          actualChartType: visualization.chartType ?? null,
          renderer: visualization.renderer ?? null,
        };
      });

      const matchedCount = details.filter((detail) => detail.matched).length;
      const score = matchedCount / details.length;

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization(s) matched the gold config.`
            : `${matchedCount}/${details.length} visualization(s) matched the gold config.`,
        metadata: {
          matchedCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}

function actualConfig(visualization: ExtractedVisualization): Record<string, unknown> {
  const actual: Record<string, unknown> = { ...(visualization.visualization ?? {}) };
  if (typeof actual.type !== 'string' && visualization.chartType) {
    actual.type = visualization.chartType;
  }
  if (typeof actual.spec !== 'string') {
    return actual;
  }
  try {
    const parsed: unknown = JSON.parse(actual.spec);
    if (isRecord(parsed)) {
      actual.spec = parsed;
    }
  } catch {
    // Leave the string; subset matching will fail against an object gold spec.
  }
  return actual;
}

function matchValue(
  gold: unknown,
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (gold === undefined) {
    return;
  }
  if (isStringAlternatives(gold)) {
    if (!typeMatches(gold, actual)) {
      mismatches.push(
        `${path || 'value'}: expected ${formatExpected(gold)}, got ${
          readType(actual) ?? 'undefined'
        }`
      );
    }
    return;
  }
  if (Array.isArray(gold)) {
    matchObjectArray(gold, actual, path, goldQuery, actualQuery, mismatches);
    return;
  }
  if (!isRecord(gold)) {
    return;
  }

  const goldColumn = readColumn(gold);
  if (goldColumn) {
    const actualColumn = readColumn(actual);
    if (!actualColumn) {
      mismatches.push(`${path}: missing column`);
      return;
    }
    if (!columnsReferToSameExpression(goldColumn, goldQuery, actualColumn, actualQuery)) {
      mismatches.push(`${path}: expected ${goldColumn}, got ${actualColumn}`);
    }
    return;
  }

  if (!isRecord(actual)) {
    mismatches.push(`${path || 'config'}: actual is missing`);
    return;
  }

  for (const [key, goldChild] of Object.entries(gold)) {
    if (goldChild === undefined || SKIP_KEYS.has(key)) {
      continue;
    }
    matchValue(
      goldChild,
      actual[key],
      path ? `${path}.${key}` : key,
      goldQuery,
      actualQuery,
      mismatches
    );
  }
}

function matchObjectArray(
  gold: unknown[],
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (!Array.isArray(actual) || actual.length < gold.length) {
    mismatches.push(
      `${path}: expected at least ${gold.length}, got ${Array.isArray(actual) ? actual.length : 0}`
    );
    return;
  }
  const used = new Set<number>();
  gold.forEach((goldItem, goldIndex) => {
    const matchIndex = actual.findIndex((candidate, actualIndex) => {
      if (used.has(actualIndex)) {
        return false;
      }
      const nested: string[] = [];
      matchValue(goldItem, candidate, `${path}[${goldIndex}]`, goldQuery, actualQuery, nested);
      return nested.length === 0;
    });
    if (matchIndex < 0) {
      mismatches.push(`${path}[${goldIndex}]: no matching item`);
      return;
    }
    used.add(matchIndex);
  });
}

function isStringAlternatives(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string'))
  );
}

function typeMatches(gold: unknown, actual: unknown): boolean {
  const expected = (Array.isArray(gold) ? gold : [gold])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase());
  const got = readType(actual);
  if (expected.length === 0 || !got) {
    return false;
  }
  return (
    expected.includes(got) ||
    (SCATTER_MARKS.has(got) && expected.some((value) => SCATTER_MARKS.has(value)))
  );
}

function readType(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }
  if (isRecord(value) && typeof value.type === 'string' && value.type.trim().length > 0) {
    return value.type.trim().toLowerCase();
  }
  return undefined;
}

function formatExpected(gold: unknown): string {
  const values = (Array.isArray(gold) ? gold : [gold]).filter(
    (value): value is string => typeof value === 'string'
  );
  return values.join(' | ');
}

function readColumn(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.column === 'string' && value.column.trim().length > 0) {
    return value.column;
  }
  if (typeof value.field === 'string' && value.field.trim().length > 0) {
    return value.field;
  }
  return undefined;
}
