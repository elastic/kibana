/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MatrixColumnConfig,
  MatrixCompositeConfig,
  MatrixConfig,
  MatrixModelConfig,
  MatrixTokenCostConfig,
} from './load_matrix_config';
import type { AggregatedEvaluatorScore, AggregatedModelScores } from './query_matrix_scores';

/** A single matrix cell: either a numeric 0-10 score or "Not recommended". */
export type MatrixCell =
  | { kind: 'score'; value: number }
  | { kind: 'not-recommended' }
  /**
   * Scores existed but every one was rejected by judge policy (self-judged,
   * non-EIS judge, or same-family when configured). Distinct from 'missing':
   * the model DID run, so re-running it changes nothing until the judge is
   * fixed. Conflating the two cost a full re-sweep on 2026-08-29.
   */
  | { kind: 'excluded'; reason: 'self-judged' | 'non-eis-judge' | 'same-family'; docs: number }
  /**
   * The model was scored on too few columns for an aggregate to mean anything
   * (`config.minCoverage`). Only ever produced for `Overall` — a 2-of-24 run
   * averaging 10.0 must not outrank a 22-of-24 run averaging 8.5.
   */
  | { kind: 'insufficient-coverage'; covered: number; required: number }
  | { kind: 'missing' };

/** Synthetic id for the legacy single "Overall" column. */
export const OVERALL_COLUMN_ID = '__overall__';

/** A column as rendered, left-to-right, including derived composite columns. */
export interface MatrixDisplayColumn {
  id: string;
  label: string;
  group?: string;
  kind: 'base' | 'composite' | 'overall';
}

export interface MatrixRow {
  modelId: string;
  modelLabel: string;
  openSource: boolean;
  /** Column/composite id -> cell. */
  cells: Record<string, MatrixCell>;
  overall: MatrixCell;
  /**
   * Base columns with a non-missing cell out of all base columns. Partial
   * coverage means `overall` and composites average fewer examples and are
   * not directly comparable to full-coverage rows.
   */
  coverage: { covered: number; total: number };
  /**
   * 1-based tier. Runs of the same model on an unchanged commit move the
   * overall score by ~0.2 (stdev over 7 haiku runs on golden), so adjacent
   * ranks are not distinguishable. Rows within a tier are statistically
   * tied; only a tier boundary is a real difference.
   */
  tier?: number;
}

/** Aggregated token magnitudes for one (model, column) pair, in native units. */
export interface TokenCostCell {
  /** Base column id (matches `MatrixDisplayColumn.id`). */
  columnId: string;
  inputTokens?: TokenStat;
  outputTokens?: TokenStat;
  /** Sum of the input + output means. */
  totalMean: number;
}

export interface TokenStat {
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface TokenCostModel {
  modelId: string;
  modelLabel: string;
  openSource: boolean;
  cells: TokenCostCell[];
}

export interface Matrix {
  columns: Array<{ id: string; label: string; group?: string }>;
  composites: Array<{ id: string; label: string; group?: string }>;
  /** Full ordered render list (base + composite + legacy overall). */
  displayColumns: MatrixDisplayColumn[];
  overallLabel: string;
  proprietary: MatrixRow[];
  openSource: MatrixRow[];
  /** Present only when the config opts into the token axis. */
  tokenCost?: { models: TokenCostModel[] };
}

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const matchesModel = (modelConfig: MatrixModelConfig, modelId: string): boolean =>
  modelConfig.id === modelId || (modelConfig.matchIds?.includes(modelId) ?? false);

const isExcludedEvaluator = (evaluatorName: string, excluded: readonly string[]): boolean =>
  excluded.some((entry) => evaluatorName.startsWith(entry));

const toCell = (value: number, config: MatrixConfig): MatrixCell =>
  value <= config.notRecommendedBelow ? { kind: 'not-recommended' } : { kind: 'score', value };

/** Sample count doubles as the aggregation weight; zero-count evaluators still count once. */
const weightOf = (evaluator: AggregatedEvaluatorScore): number =>
  evaluator.count > 0 ? evaluator.count : 1;

/** Yields every evaluator contributing to a column, applying the suite/dataset filters. */
function* columnEvaluators(
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig
): Generator<AggregatedEvaluatorScore> {
  const suiteSet = new Set(column.suites);
  // `examplePrefixes` columns consume the synthetic per-prefix datasets
  // (datasetId `prefix:<name>`) produced by queryMatrixScores; a `datasetIds`
  // column keeps its raw dataset-id semantics unchanged.
  const datasetSet = column.examplePrefixes
    ? new Set(column.examplePrefixes.map((prefix) => `prefix:${prefix}`))
    : column.datasetIds
    ? new Set(column.datasetIds)
    : undefined;

  for (const suite of modelScores.suites) {
    if (!suiteSet.has(suite.suiteId)) {
      continue;
    }
    for (const dataset of suite.datasets) {
      if (!datasetSet || datasetSet.has(dataset.datasetId)) {
        yield* dataset.evaluators;
      }
    }
  }
}

/**
 * Weighted mean (by sample count) of the evaluator scores mapped to a column.
 * Returns `undefined` when no scores contribute.
 */
const computeColumnMean = (
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig,
  excludeEvaluators: readonly string[]
): number | undefined => {
  const evaluatorSet = column.evaluators ? new Set(column.evaluators) : undefined;

  let weightedSum = 0;
  let totalCount = 0;

  for (const evaluator of columnEvaluators(modelScores, column)) {
    // A column may opt into an explicit evaluator allowlist; otherwise the global
    // exclusion list drops raw-magnitude evaluators that would blow out the 0-10 scale.
    const skip = evaluatorSet
      ? !evaluatorSet.has(evaluator.evaluatorName)
      : isExcludedEvaluator(evaluator.evaluatorName, excludeEvaluators);
    if (skip) {
      continue;
    }

    const weight = weightOf(evaluator);
    weightedSum += evaluator.mean * weight;
    totalCount += weight;
  }

  return totalCount === 0 ? undefined : weightedSum / totalCount;
};

const buildCell = (
  mean: number | undefined,
  column: MatrixColumnConfig,
  config: MatrixConfig
): MatrixCell => {
  if (mean === undefined) {
    return { kind: 'missing' };
  }

  const scale = column.scale ?? config.defaultScale;
  return toCell(roundTo(mean * scale, config.decimals), config);
};

/**
 * Weighted mean of already-computed cells, shared by the legacy Overall column and
 * composites: "Not recommended" sources contribute 0 (when configured) and missing
 * sources are skipped, so the result reflects the data that exists rather than being
 * dragged to "missing" by not-yet-wired columns.
 */
const aggregateCells = (
  sources: Array<{ cell: MatrixCell | undefined; weight: number }>,
  config: MatrixConfig
): MatrixCell => {
  let weightedSum = 0;
  let totalWeight = 0;
  let hasAnyData = false;

  for (const { cell, weight } of sources) {
    // 'excluded' means every score was rejected by judge policy, so there is no
    // trustworthy value to aggregate. Skip like 'missing' rather than counting
    // it as a zero, which would silently depress Overall for a model that ran.
    if (!cell || cell.kind === 'missing' || cell.kind === 'excluded') {
      continue;
    }

    hasAnyData = true;

    if (cell.kind === 'not-recommended' || cell.kind === 'insufficient-coverage') {
      if (config.notRecommendedCountsAsZeroInOverall && cell.kind === 'not-recommended') {
        totalWeight += weight;
      }
      continue;
    }

    weightedSum += cell.value * weight;
    totalWeight += weight;
  }

  if (!hasAnyData || totalWeight === 0) {
    return { kind: 'missing' };
  }

  return toCell(roundTo(weightedSum / totalWeight, config.decimals), config);
};

const computeOverall = (cells: Record<string, MatrixCell>, config: MatrixConfig): MatrixCell =>
  aggregateCells(
    config.columns.map((column) => ({
      cell: cells[column.id],
      weight: config.overall.mode === 'weighted' ? column.weight : 1,
    })),
    config
  );

const computeComposite = (
  cells: Record<string, MatrixCell>,
  composite: MatrixCompositeConfig,
  config: MatrixConfig
): MatrixCell =>
  aggregateCells(
    composite.from.map((refId) => ({ cell: cells[refId], weight: 1 })),
    config
  );

/** Resolves the left-to-right render order of base + composite (+ overall) columns. */
const buildDisplayColumns = (config: MatrixConfig): MatrixDisplayColumn[] => {
  const baseById = new Map(config.columns.map((column) => [column.id, column]));
  const compositeById = new Map(config.composites.map((composite) => [composite.id, composite]));

  const declared: MatrixDisplayColumn[] = config.layout
    ? config.layout.map((id): MatrixDisplayColumn => {
        const base = baseById.get(id);
        if (base) {
          return { id, label: base.label, group: base.group, kind: 'base' };
        }
        const composite = compositeById.get(id);
        if (composite) {
          return { id, label: composite.label, group: composite.group, kind: 'composite' };
        }
        throw new Error(`Matrix config "layout" references unknown column/composite id: "${id}"`);
      })
    : [
        ...config.columns.map(
          (column): MatrixDisplayColumn => ({
            id: column.id,
            label: column.label,
            group: column.group,
            kind: 'base',
          })
        ),
        ...config.composites.map(
          (composite): MatrixDisplayColumn => ({
            id: composite.id,
            label: composite.label,
            group: composite.group,
            kind: 'composite',
          })
        ),
      ];

  return config.showOverall
    ? [...declared, { id: OVERALL_COLUMN_ID, label: config.overall.label, kind: 'overall' }]
    : declared;
};

/**
 * Aggregates the raw-magnitude token evaluators for one (model, column) pair. Unlike
 * the quality path these stay in native units and preserve the observed min/max spread.
 */
const computeTokenStat = (
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig,
  evaluatorPrefix: string
): TokenStat | undefined => {
  let weightedSum = 0;
  let totalCount = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const evaluator of columnEvaluators(modelScores, column)) {
    if (!evaluator.evaluatorName.startsWith(evaluatorPrefix)) {
      continue;
    }

    const weight = weightOf(evaluator);
    weightedSum += evaluator.mean * weight;
    totalCount += weight;
    // Stats payloads may omit the per-experiment extremes; the mean is the only bound then.
    min = Math.min(min, evaluator.min ?? evaluator.mean);
    max = Math.max(max, evaluator.max ?? evaluator.mean);
  }

  if (totalCount === 0) {
    return undefined;
  }

  return { mean: weightedSum / totalCount, min, max, count: totalCount };
};

const buildTokenCost = (
  config: MatrixConfig,
  tokenConfig: MatrixTokenCostConfig,
  resolveScores: (modelConfig: MatrixModelConfig) => AggregatedModelScores | undefined
): { models: TokenCostModel[] } => {
  const columnIds = tokenConfig.columns;
  const tokenColumns = columnIds
    ? config.columns.filter((column) => columnIds.includes(column.id))
    : config.columns;

  const models: TokenCostModel[] = [];

  for (const modelConfig of config.models) {
    const modelScores = resolveScores(modelConfig);
    if (!modelScores) {
      continue;
    }

    const cells: TokenCostCell[] = [];
    for (const column of tokenColumns) {
      const inputTokens = computeTokenStat(modelScores, column, tokenConfig.inputEvaluator);
      const outputTokens = computeTokenStat(modelScores, column, tokenConfig.outputEvaluator);
      if (!inputTokens && !outputTokens) {
        continue;
      }
      cells.push({
        columnId: column.id,
        inputTokens,
        outputTokens,
        totalMean: (inputTokens?.mean ?? 0) + (outputTokens?.mean ?? 0),
      });
    }

    if (cells.length > 0) {
      models.push({
        modelId: modelConfig.id,
        modelLabel: modelConfig.label,
        openSource: modelConfig.openSource,
        cells,
      });
    }
  }

  return { models };
};

/**
 * Pure transform from aggregated eval scores + config into a renderable matrix.
 * Models are emitted in config order; models absent from the data are skipped.
 */
/**
 * Groups rows into tiers of statistically indistinguishable models.
 *
 * Re-running one model on an unchanged commit and stack moves its overall by
 * about 0.2 (stdev across 7 haiku runs on golden), so a 0.05 gap between two
 * adjacent rows is noise, not a ranking. Rows stay in the same tier until the
 * drop from the tier leader exceeds the combined 95% interval; only crossing
 * a tier boundary is a difference the data can support.
 */
const assignTiers = (rows: MatrixRow[], config: MatrixConfig): MatrixRow[] => {
  const sd = config.overall.runStdev;
  if (!sd) {
    return rows;
  }
  const threshold = 2 * 1.96 * sd;
  let tier = 1;
  let leader: number | undefined;
  return rows.map((row) => {
    const value = row.overall.kind === 'score' ? row.overall.value : undefined;
    if (value === undefined) {
      return row;
    }
    if (leader === undefined) {
      leader = value;
    } else if (leader - value > threshold) {
      tier += 1;
      leader = value;
    }
    return { ...row, tier };
  });
};

export const buildMatrix = (aggregated: AggregatedModelScores[], config: MatrixConfig): Matrix => {
  const byModelId = new Map(aggregated.map((entry) => [entry.modelId, entry]));
  const resolveScores = (modelConfig: MatrixModelConfig) =>
    byModelId.get(modelConfig.id) ??
    aggregated.find((entry) => matchesModel(modelConfig, entry.modelId));

  const proprietary: MatrixRow[] = [];
  const openSource: MatrixRow[] = [];

  for (const modelConfig of config.models) {
    const modelScores = resolveScores(modelConfig);
    if (!modelScores) {
      continue;
    }

    const cells: Record<string, MatrixCell> = {};
    for (const column of config.columns) {
      cells[column.id] = buildCell(
        computeColumnMean(modelScores, column, config.excludeEvaluators),
        column,
        config
      );
    }

    // Declared order, so a later composite can reference an earlier one (e.g. Overall
    // Score <- Agent Builder Score); an unresolved reference contributes nothing.
    for (const composite of config.composites) {
      cells[composite.id] = computeComposite(cells, composite, config);
    }

    // A scored column is one with a real, trustworthy value. 'excluded' cells
    // ran but had every grade rejected, so they are NOT coverage — counting
    // them would let a fully self-judged model claim a full row.
    const scoredColumns = config.columns.filter((c) => cells[c.id].kind === 'score').length;
    const overall = computeOverall(cells, config);

    const row: MatrixRow = {
      modelId: modelConfig.id,
      modelLabel: modelConfig.label,
      openSource: modelConfig.openSource,
      cells,
      // Publishing an average over too few columns invites the wrong read: a
      // model scored on 2 of 24 prompts averaged 10.0 and ranked above every
      // frontier model until this floor existed.
      overall:
        config.minCoverage > 0 && scoredColumns < config.minCoverage
          ? { kind: 'insufficient-coverage', covered: scoredColumns, required: config.minCoverage }
          : overall,
      coverage: {
        covered: scoredColumns,
        total: config.columns.length,
      },
    };

    (modelConfig.openSource ? openSource : proprietary).push(row);
  }

  // Rank by the final composite (e.g. Overall Score) when composites exist,
  // otherwise by the legacy Overall column.
  const primaryId =
    config.composites.length > 0
      ? config.composites[config.composites.length - 1].id
      : OVERALL_COLUMN_ID;

  const sortValue = (row: MatrixRow): number => {
    const cell = primaryId === OVERALL_COLUMN_ID ? row.overall : row.cells[primaryId];
    return cell && cell.kind === 'score' ? cell.value : -1;
  };

  const sortByPrimaryDesc = (a: MatrixRow, b: MatrixRow): number => sortValue(b) - sortValue(a);

  return {
    columns: config.columns.map((column) => ({
      id: column.id,
      label: column.label,
      group: column.group,
    })),
    composites: config.composites.map((composite) => ({
      id: composite.id,
      label: composite.label,
      group: composite.group,
    })),
    displayColumns: buildDisplayColumns(config),
    overallLabel: config.overall.label,
    proprietary: assignTiers(proprietary.sort(sortByPrimaryDesc), config),
    openSource: assignTiers(openSource.sort(sortByPrimaryDesc), config),
    // Token magnitudes are meaningful only over base columns; composites are derived scores.
    ...(config.tokenCost
      ? { tokenCost: buildTokenCost(config, config.tokenCost, resolveScores) }
      : {}),
  };
};
