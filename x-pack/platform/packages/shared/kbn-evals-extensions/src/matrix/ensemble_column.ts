/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collapse several judges' scores for the same cells into one ensemble column.
 *
 * A single-judge column carries that judge's idiosyncratic scatter, and on this
 * board the scatter is larger than the gaps it has to resolve. Averaging N
 * judges over identical cells cuts the independent component of that noise by
 * about sqrt(N) while leaving real model differences intact, because the noise
 * is judge-specific and the signal is not.
 *
 * Two things are deliberately kept alongside the mean:
 *
 *   - `judgeSpread` -- how far apart the judges were on this model. A high
 *     ensemble score built from judges that disagreed violently is not the same
 *     claim as one they all agreed on, and collapsing to a bare mean hides it.
 *   - `judgeCount` -- how many judges contributed. A model averaged over two
 *     judges must not silently sit next to one averaged over four.
 *
 * The ensemble is only computed over cells EVERY judge graded. Averaging over
 * ragged coverage would let a model look strong because the judge that dislikes
 * it happened to fail on its cells.
 */

export interface EnsembleCellInput {
  judgeId: string;
  modelId: string;
  exampleId: string;
  score: number;
}

export interface EnsembleModelScore {
  modelId: string;
  /** Mean across judges of that judge's mean over the shared cells. */
  ensemble: number;
  /** Max-min of the per-judge means. Wide means the judges disagreed. */
  judgeSpread: number;
  judgeCount: number;
  cellCount: number;
  /** Per-judge mean, so a reader can see what the ensemble is hiding. */
  perJudge: Record<string, number>;
}

export interface EnsembleColumn {
  models: EnsembleModelScore[];
  judges: string[];
  /** Cells graded by every judge and therefore eligible for the ensemble. */
  sharedCellCount: number;
  /**
   * Expected noise reduction, sqrt(N) for N judges. Reported rather than
   * applied: it is the theoretical factor for independent judge error, and
   * judges are not fully independent, so it is an upper bound on the benefit.
   */
  noiseReductionFactor: number;
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

const SEP = '\u0000';
const key = (modelId: string, exampleId: string) => `${modelId}${SEP}${exampleId}`;

/**
 * Build the ensemble column.
 *
 * Throws rather than degrading when judges share no cells: an "ensemble" over
 * disjoint cells is just a relabelled average of different measurements, and
 * publishing it as a consensus would be a stronger claim than the data makes.
 */
export function buildEnsembleColumn(cells: EnsembleCellInput[]): EnsembleColumn {
  const judges = [...new Set(cells.map((c) => c.judgeId))].sort();
  if (judges.length < 2) {
    throw new Error(
      `An ensemble needs at least 2 judges; got ${judges.length}. A single judge is just that judge's column.`
    );
  }

  const byJudge = new Map<string, Map<string, number>>();
  for (const judgeId of judges) byJudge.set(judgeId, new Map());
  for (const c of cells) byJudge.get(c.judgeId)!.set(key(c.modelId, c.exampleId), c.score);

  const [first, ...rest] = judges;
  const sharedKeys = [...byJudge.get(first)!.keys()].filter((k) =>
    rest.every((j) => byJudge.get(j)!.has(k))
  );

  if (sharedKeys.length === 0) {
    throw new Error(
      `No cell was graded by all ${judges.length} judges, so there is no shared basis to average over.`
    );
  }

  const keysByModel = new Map<string, string[]>();
  for (const k of sharedKeys) {
    const modelId = k.split(SEP)[0];
    keysByModel.set(modelId, [...(keysByModel.get(modelId) ?? []), k]);
  }

  const models: EnsembleModelScore[] = [...keysByModel.keys()].sort().map((modelId) => {
    const modelKeys = keysByModel.get(modelId)!;
    const perJudge: Record<string, number> = Object.fromEntries(
      judges.map((j) => [j, mean(modelKeys.map((k) => byJudge.get(j)!.get(k)!))])
    );
    const judgeMeans = Object.values(perJudge);

    return {
      modelId,
      ensemble: mean(judgeMeans),
      judgeSpread: Math.max(...judgeMeans) - Math.min(...judgeMeans),
      judgeCount: judges.length,
      cellCount: modelKeys.length,
      perJudge,
    };
  });

  return {
    models: models.sort((a, b) => b.ensemble - a.ensemble),
    judges,
    sharedCellCount: sharedKeys.length,
    noiseReductionFactor: Math.sqrt(judges.length),
  };
}
