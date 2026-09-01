/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Trajectory agreement across repetitions of the same (model, example).
 *
 * Key on `tool_id`, never `tool_call_id`. Provider invocation ids are unique
 * per call, so comparing them reports 100% divergence by construction even
 * when the agent issued the same tools.
 *
 * A cell with one repetition is `unmeasured`, not 0 and not 1. Collapsing
 * those three is how a 21-of-23 empty reliability column would look "broken"
 * on the current corpus.
 */

export type ReliabilityStatus = 'unmeasured' | 'measured';

export interface TrajectoryCell {
  model: string;
  example: string;
  /** One tool_id sequence per repetition. Empty sequences are kept. */
  trails: string[][];
}

export interface TrajectoryAgreement {
  status: ReliabilityStatus;
  /** Distinct repetitions that produced a trail. 1 → unmeasured. */
  repetitions: number;
  /**
   * Pairwise identical-sequence rate in [0, 1]. Undefined when unmeasured.
   * Identity, not similarity: order-preserving exact match of tool_id lists.
   */
  identicalRate?: number;
  /** Mean pairwise LCS / max(len_a, len_b). Undefined when unmeasured. */
  sequenceSimilarity?: number;
}

export interface ReliabilityRow {
  modelId: string;
  status: ReliabilityStatus;
  cells: number;
  measuredCells: number;
  identicalRate?: number;
  sequenceSimilarity?: number;
}

const lcsLength = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const prev = new Array<number>(b.length + 1).fill(0);
  const curr = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }
  return prev[b.length];
};

/** SequenceMatcher-style ratio: 2 * LCS / (len_a + len_b). */
export const sequenceSimilarity = (a: string[], b: string[]): number => {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  const denom = a.length + b.length;
  if (denom === 0) {
    return 1;
  }
  return (2 * lcsLength(a, b)) / denom;
};

const pairwiseMean = (trails: string[][], pairFn: (a: string[], b: string[]) => number): number => {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < trails.length; i++) {
    for (let j = i + 1; j < trails.length; j++) {
      sum += pairFn(trails[i], trails[j]);
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
};

export const trailsEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i]);

export const cellAgreement = (trails: string[][]): TrajectoryAgreement => {
  if (trails.length <= 1) {
    return { status: 'unmeasured', repetitions: trails.length };
  }
  return {
    status: 'measured',
    repetitions: trails.length,
    identicalRate: pairwiseMean(trails, (a, b) => (trailsEqual(a, b) ? 1 : 0)),
    sequenceSimilarity: pairwiseMean(trails, sequenceSimilarity),
  };
};

export const rowAgreement = (cells: TrajectoryCell[], modelId: string): ReliabilityRow => {
  const mine = cells.filter((c) => c.model === modelId);
  const measured = mine.map((c) => cellAgreement(c.trails)).filter((a) => a.status === 'measured');
  if (measured.length === 0) {
    return { modelId, status: 'unmeasured', cells: mine.length, measuredCells: 0 };
  }
  const identicalRate = measured.reduce((s, a) => s + (a.identicalRate ?? 0), 0) / measured.length;
  const sequenceSim =
    measured.reduce((s, a) => s + (a.sequenceSimilarity ?? 0), 0) / measured.length;
  return {
    modelId,
    status: 'measured',
    cells: mine.length,
    measuredCells: measured.length,
    identicalRate,
    sequenceSimilarity: sequenceSim,
  };
};

/**
 * Group per-rep tool_id sequences from score documents of one example.
 * Docs sharing a repetition_index are the same agent run (one per evaluator);
 * the first complete trail wins. Key on tool_id only.
 */
/**
 * Hunt/investigation examples have no repeatable path (0/5 on the 3-rep
 * pilot). They stay diagnostic probes and must not enter the agreement rate.
 */
export const PROBE_EXAMPLE_PREFIXES = [
  'alert-analysis-',
  'entity-analytics-',
  'multi-step-',
  'threat-hunting-',
] as const;

export const isProbeExample = (exampleId: string): boolean =>
  PROBE_EXAMPLE_PREFIXES.some((prefix) => exampleId.startsWith(prefix));

export const trailsFromDocs = (docs: ReadonlyArray<{ task?: unknown }>): string[][] => {
  const byRep = new Map<number, string[]>();
  for (const doc of docs) {
    const task = doc.task as
      | {
          repetition_index?: number;
          output?: { steps?: Array<{ type?: string; tool_id?: string }> };
        }
      | undefined;
    const rep = task?.repetition_index ?? 0;
    if (byRep.has(rep)) {
      continue;
    }
    const trail: string[] = [];
    for (const step of task?.output?.steps ?? []) {
      if (step.type === 'tool_call' && step.tool_id) {
        trail.push(step.tool_id);
      }
    }
    byRep.set(rep, trail);
  }
  return [...byRep.entries()].sort((a, b) => a[0] - b[0]).map(([, trail]) => trail);
};
