/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticBag } from './diagnostics';
import { escapeField, esqlSource, mergeAggWhere } from './esql';
import { buildFiltersBucket } from './filters_bucket';
import { type LoweredFormula, lowerFormulaToStatsEval, type StatsAggregation } from './formula';
import { collectLensStatePredicates } from './lens_filters';
import type { SynthesisInput, SynthesisOutput } from './query_types';
import { parseShiftToEsqlInterval, resolveTimeWindow, timeRangeDurationMs } from './time';
import type { FormBasedColumn, FormBasedLayer, LensState } from './types';

const FORM_BASED_OP_TO_ESQL: Record<string, string> = {
  count: 'COUNT(*)',
  unique_count: 'COUNT_DISTINCT',
  cardinality: 'COUNT_DISTINCT',
  sum: 'SUM',
  average: 'AVG',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
  median: 'MEDIAN',
};

const formBasedOpToEsql = (column: FormBasedColumn): string | undefined => {
  const op = column.operationType;
  if (op === 'count' && !column.sourceField) {
    return 'COUNT(*)';
  }
  if (op === 'percentile' && column.sourceField) {
    const params = column.params as { percentile?: number } | undefined;
    const percentile = typeof params?.percentile === 'number' ? params.percentile : 95;
    return `PERCENTILE(${escapeField(column.sourceField)}, ${percentile})`;
  }
  const fn = FORM_BASED_OP_TO_ESQL[op];
  if (!fn || !column.sourceField) {
    return undefined;
  }
  return fn === 'COUNT(*)' ? fn : `${fn}(${escapeField(column.sourceField)})`;
};

const staticValueLiteral = (column: FormBasedColumn): string | undefined => {
  const raw = (column.params as { value?: unknown } | undefined)?.value;
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
      ? Number(raw)
      : Number.NaN;
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Number.isInteger(value) ? `${value}.0` : String(value);
};

const isTimeBucket = (column: FormBasedColumn): boolean =>
  column.operationType === 'date_histogram';

const bucketField = (column: FormBasedColumn): string => column.sourceField ?? '@timestamp';

const bucketInterval = (column: FormBasedColumn): string => {
  const params = column.params ?? {};
  const interval = (params as { interval?: unknown }).interval;
  if (typeof interval === 'string' && interval !== 'auto') {
    return interval;
  }
  return '1h';
};

interface BuildShiftedStatsInput {
  currentAggs: string[];
  shiftedAggs: StatsAggregation[];
  fromEsql: string;
  toEsql: string;
  timeField: string;
  timeBucket?: { id: string; field: string; interval: string };
  diagnostics: DiagnosticBag;
}

interface ShiftedStatsResult {
  statsAggs: string[];
  timeBucketTerm?: string;
  fromWhere: string;
}

const buildShiftedStats = (input: BuildShiftedStatsInput): ShiftedStatsResult | undefined => {
  const { currentAggs, shiftedAggs, fromEsql, toEsql, timeField, timeBucket, diagnostics } = input;
  const timeFieldEsql = escapeField(timeField);
  const distinctShifts = [
    ...new Set(
      shiftedAggs.map((agg) => agg.shift).filter((shift): shift is string => Boolean(shift))
    ),
  ];
  if (distinctShifts.length === 0) {
    return undefined;
  }
  if (distinctShifts.length > 1) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.time-shift-multiple',
      message: `multiple distinct time shifts (${distinctShifts.join(
        ', '
      )}) in one layer are not supported; panel degraded`,
    });
    return undefined;
  }
  const shiftInterval = parseShiftToEsqlInterval(distinctShifts[0]!);
  if (!shiftInterval) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.time-shift-unrecognized',
      message: `time shift "${distinctShifts[0]}" could not be parsed`,
    });
    return undefined;
  }

  const currentWindow = `${timeFieldEsql} >= ${fromEsql} AND ${timeFieldEsql} < ${toEsql}`;
  const shiftedWindow = `${timeFieldEsql} >= ${fromEsql} - ${shiftInterval} AND ${timeFieldEsql} < ${toEsql} - ${shiftInterval}`;
  const statsAggs: string[] = [];
  for (const aggString of currentAggs) {
    const eqIdx = aggString.indexOf('=');
    if (eqIdx < 0) {
      statsAggs.push(aggString);
      continue;
    }
    const alias = aggString.slice(0, eqIdx).trim();
    const expression = aggString.slice(eqIdx + 1).trim();
    statsAggs.push(`${alias} = ${mergeAggWhere(expression, currentWindow)}`);
  }
  for (const shifted of shiftedAggs) {
    statsAggs.push(`${shifted.alias} = ${mergeAggWhere(shifted.expression, shiftedWindow)}`);
  }

  let timeBucketTerm: string | undefined;
  if (timeBucket) {
    const field = escapeField(timeBucket.field);
    const aligned = `CASE(${field} >= ${fromEsql}, ${field}, ${field} + ${shiftInterval})`;
    timeBucketTerm = `${escapeField(timeBucket.id)} = BUCKET(${aligned}, ${timeBucket.interval})`;
  }

  const fromWhere = `${timeFieldEsql} >= ${fromEsql} - ${shiftInterval} AND ${timeFieldEsql} < ${toEsql}`;
  return {
    statsAggs,
    ...(timeBucketTerm ? { timeBucketTerm } : {}),
    fromWhere,
  };
};

export const firstFormBasedLayer = (
  state: LensState,
  preferredLayerId?: string
): { id: string; layer: FormBasedLayer } | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  if (!layers) {
    return undefined;
  }
  if (preferredLayerId && layers[preferredLayerId]) {
    return { id: preferredLayerId, layer: layers[preferredLayerId] };
  }
  const entries = Object.entries(layers);
  const first = entries[0];
  return first ? { id: first[0], layer: first[1] } : undefined;
};

export const synthesizeFromFormBased = (
  layer: FormBasedLayer,
  layerId: string,
  input: SynthesisInput
): SynthesisOutput | undefined => {
  const { diagnostics } = input;
  diagnostics.push({
    level: 'info',
    code: 'lens.formBased.lowered-to-esql',
    message: 'Lens panel uses the form-based datasource; converter synthesized an ES|QL query',
  });

  const columns = layer.columnOrder
    .map((columnId) => ({ id: columnId, column: layer.columns[columnId] }))
    .filter(
      (entry): entry is { id: string; column: FormBasedColumn } => entry.column !== undefined
    );
  if (columns.length === 0) {
    diagnostics.push({
      level: 'error',
      code: 'lens.formBased.no-columns',
      message: 'form-based layer has no columns',
    });
    return undefined;
  }

  const buckets = columns.filter((entry) => entry.column.isBucketed);
  const metrics = columns.filter((entry) => !entry.column.isBucketed);
  if (metrics.length === 0) {
    diagnostics.push({
      level: 'error',
      code: 'lens.formBased.no-metrics',
      message: 'form-based layer has no metric columns',
    });
    return undefined;
  }

  const formulaColumns = metrics.filter((entry) => entry.column.operationType === 'formula');
  const isFormulaHelper = (column: FormBasedColumn): boolean =>
    column.operationType === 'math' ||
    column.operationType === 'formula' ||
    (typeof column.label === 'string' && column.label.startsWith('Part of '));

  const statsAggs: string[] = [];
  const evalsAfterStats: string[] = [];
  const shiftedAggs: StatsAggregation[] = [];

  if (formulaColumns.length > 0) {
    const loweredFormulas: Array<{
      entry: { id: string; column: FormBasedColumn };
      lowered: LoweredFormula;
    }> = [];
    const aliasCounter = { n: 0 };
    const timeRangeMs = timeRangeDurationMs(input.timeRange);
    for (const entry of formulaColumns) {
      const formulaString = (entry.column.params as { formula?: string } | undefined)?.formula;
      if (typeof formulaString !== 'string' || formulaString.trim() === '') {
        diagnostics.push({
          level: 'warn',
          code: 'lens.formBased.formula-missing',
          message: `formula column "${entry.column.label ?? entry.id}" has no formula expression`,
        });
        return undefined;
      }
      const lowered = lowerFormulaToStatsEval({
        formula: formulaString,
        formulaColumnLabel: entry.column.label ?? entry.id,
        diagnostics,
        aliasCounter,
        ...(timeRangeMs !== undefined ? { timeRangeMs } : {}),
      });
      if (!lowered) {
        return undefined;
      }
      loweredFormulas.push({ entry, lowered });
    }

    for (const { entry, lowered } of loweredFormulas) {
      for (const agg of lowered.aggregations) {
        statsAggs.push(`${agg.alias} = ${agg.expression}`);
      }
      evalsAfterStats.push(`${escapeField(entry.id)} = ${lowered.evalExpression}`);
      if (lowered.shiftedAggregations.length > 0) {
        shiftedAggs.push(...lowered.shiftedAggregations);
      }
    }
  }

  for (const entry of metrics) {
    if (isFormulaHelper(entry.column)) {
      continue;
    }
    if (entry.column.operationType === 'static_value') {
      const literal = staticValueLiteral(entry.column);
      if (literal === undefined) {
        diagnostics.push({
          level: 'warn',
          code: 'lens.formBased.static-value-unparseable',
          message: `static_value column "${
            entry.column.label ?? entry.id
          }" has no numeric value; dropped`,
        });
        continue;
      }
      evalsAfterStats.push(`${escapeField(entry.id)} = ${literal}`);
      continue;
    }
    const agg = formBasedOpToEsql(entry.column);
    if (!agg) {
      diagnostics.push({
        level: 'error',
        code: 'lens.formBased.unsupported-operation',
        message: `unsupported metric operation "${entry.column.operationType}"; cannot synthesize ES|QL`,
      });
      return undefined;
    }
    const shift = typeof entry.column.timeShift === 'string' ? entry.column.timeShift.trim() : '';
    if (shift) {
      shiftedAggs.push({
        alias: escapeField(entry.id),
        expression: agg,
        shift,
      });
    } else {
      statsAggs.push(`${escapeField(entry.id)} = ${agg}`);
    }
  }

  if (statsAggs.length === 0 && shiftedAggs.length === 0) {
    diagnostics.push({
      level: 'error',
      code: 'lens.formBased.no-synthesizable-metrics',
      message: 'form-based layer has no synthesizable metric columns after formula lowering',
    });
    return undefined;
  }

  const timeWindow = resolveTimeWindow(input.timeRange, diagnostics);
  const timeBucketEntry = buckets.find((entry) => isTimeBucket(entry.column));
  const dateHistogramField = timeBucketEntry?.column.sourceField;
  const timeField = input.timeFieldName ?? dateHistogramField ?? '@timestamp';
  let shiftResult: ShiftedStatsResult | undefined;
  if (shiftedAggs.length > 0) {
    const FALLBACK_WINDOW = '24 hour';
    const window = timeWindow?.durationEsql ?? FALLBACK_WINDOW;
    if (!timeWindow?.durationEsql) {
      diagnostics.push({
        level: 'info',
        code: 'lens.formBased.time-shift-window-assumed',
        message: `time-shifted metrics assumed a ${FALLBACK_WINDOW} analysis window on field "${timeField}"; pass a relative timeRange (e.g. now-7d/now) to override`,
      });
    }
    shiftResult = buildShiftedStats({
      currentAggs: statsAggs,
      shiftedAggs,
      fromEsql: timeWindow?.fromEsql ?? `NOW() - ${window}`,
      toEsql: timeWindow?.toEsql ?? 'NOW()',
      timeField,
      ...(timeBucketEntry
        ? {
            timeBucket: {
              id: timeBucketEntry.id,
              field: bucketField(timeBucketEntry.column),
              interval: bucketInterval(timeBucketEntry.column),
            },
          }
        : {}),
      diagnostics,
    });
    if (!shiftResult) {
      return undefined;
    }
    statsAggs.length = 0;
    statsAggs.push(...shiftResult.statsAggs);
  }

  const byTerms: string[] = [];
  const evals: string[] = [];
  const extraWhere: string[] = [];
  for (const entry of buckets) {
    if (isTimeBucket(entry.column)) {
      if (shiftResult?.timeBucketTerm) {
        byTerms.push(shiftResult.timeBucketTerm);
      } else {
        const field = escapeField(bucketField(entry.column));
        const interval = bucketInterval(entry.column);
        byTerms.push(`${escapeField(entry.id)} = BUCKET(${field}, ${interval})`);
      }
    } else if (entry.column.operationType === 'terms' && entry.column.sourceField) {
      evals.push(`${escapeField(entry.id)} = ${escapeField(entry.column.sourceField)}`);
      byTerms.push(escapeField(entry.id));
    } else if (entry.column.sourceField) {
      evals.push(`${escapeField(entry.id)} = ${escapeField(entry.column.sourceField)}`);
      byTerms.push(escapeField(entry.id));
    } else if (entry.column.operationType === 'filters') {
      const built = buildFiltersBucket(entry.column);
      if (!built) {
        diagnostics.push({
          level: 'warn',
          code: 'lens.formBased.filters-bucket-unsupported',
          message: `filters bucket "${entry.id}" uses a query the converter can't lower to ES|QL; dropping the breakdown`,
        });
      } else {
        evals.push(`${escapeField(entry.id)} = ${built.caseExpr}`);
        byTerms.push(escapeField(entry.id));
        extraWhere.push(built.matchWhere);
      }
    } else {
      diagnostics.push({
        level: 'warn',
        code: 'lens.formBased.unrecognized-bucket',
        message: `unrecognized bucket operation "${entry.column.operationType}"`,
      });
    }
  }

  const indexPattern = input.indexPatternTitle ? esqlSource(input.indexPatternTitle) : '*';
  if (input.indexPatternTitle === undefined) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.unresolved-index-pattern',
      message:
        'index pattern reference was not resolved; query uses "*" — host should substitute the resolved pattern',
    });
  }

  const parts: string[] = [`FROM ${indexPattern}`];
  const whereClauses: string[] = [];
  if (shiftResult) {
    whereClauses.push(shiftResult.fromWhere);
  } else if (timeWindow) {
    const timeFieldEsql = escapeField(timeField);
    whereClauses.push(
      `${timeFieldEsql} >= ${timeWindow.fromEsql} AND ${timeFieldEsql} < ${timeWindow.toEsql}`
    );
  }
  // A layer that opts out of global filter context takes neither the Lens
  // saved query nor its filters. Bucket-local `extraWhere` still applies —
  // that is the column's own filter, not global context — and so does the
  // time window.
  if (layer.ignoreGlobalFilters) {
    diagnostics.push({
      level: 'info',
      code: 'lens.formBased.ignores-global-filters',
      message:
        'layer sets ignoreGlobalFilters; Lens query/filters and dashboard filters are not applied',
    });
  } else {
    whereClauses.push(...collectLensStatePredicates(input.state, diagnostics));
  }
  whereClauses.push(...extraWhere);
  if (whereClauses.length > 0) {
    parts.push(`WHERE ${whereClauses.join(' AND ')}`);
  }
  if (evals.length > 0) {
    parts.push(`EVAL ${evals.join(', ')}`);
  }
  const statsClause = `STATS ${statsAggs.join(', ')}${
    byTerms.length > 0 ? ` BY ${byTerms.join(', ')}` : ''
  }`;
  parts.push(statsClause);
  if (evalsAfterStats.length > 0) {
    parts.push(`EVAL ${evalsAfterStats.join(', ')}`);
  }
  if (byTerms.length > 0) {
    const ranking = termsMetricRanking(buckets, metrics);
    if (timeBucketEntry) {
      const firstBy = byTerms[0]!;
      const assignmentIndex = firstBy.indexOf('=');
      const sortKey = assignmentIndex >= 0 ? firstBy.slice(0, assignmentIndex).trim() : firstBy;
      parts.push(`SORT ${sortKey}`);
    } else if (ranking) {
      parts.push(`SORT ${escapeField(ranking.sortColumn)} ${ranking.direction}`);
      if (ranking.size !== undefined) {
        parts.push(`LIMIT ${ranking.size}`);
      }
    } else {
      const firstBy = byTerms[0]!;
      const assignmentIndex = firstBy.indexOf('=');
      const sortKey = assignmentIndex >= 0 ? firstBy.slice(0, assignmentIndex).trim() : firstBy;
      parts.push(`SORT ${sortKey}`);
    }
  }

  return {
    query: {
      esql: parts.join(' | '),
      ...(input.indexPatternTitle ? { indexPattern: input.indexPatternTitle } : {}),
      ...(layer.ignoreGlobalFilters ? { ignoreGlobalFilters: true } : {}),
    },
    resolvedLayerId: layerId,
  };
};

interface TermsMetricRanking {
  sortColumn: string;
  direction: 'ASC' | 'DESC';
  size?: number;
}

const termsMetricRanking = (
  buckets: Array<{ id: string; column: FormBasedColumn }>,
  metrics: Array<{ id: string; column: FormBasedColumn }>
): TermsMetricRanking | undefined => {
  const terms = buckets.find((entry) => entry.column.operationType === 'terms');
  if (!terms) {
    return undefined;
  }
  const params = terms.column.params ?? {};
  const size =
    typeof params.size === 'number' && Number.isFinite(params.size)
      ? Math.max(1, Math.floor(params.size))
      : undefined;
  const direction = params.orderDirection === 'asc' ? 'ASC' : 'DESC';
  const orderBy = params.orderBy;
  const orderByColumnId =
    orderBy &&
    typeof orderBy === 'object' &&
    'columnId' in orderBy &&
    typeof (orderBy as { columnId?: unknown }).columnId === 'string'
      ? (orderBy as { columnId: string }).columnId
      : undefined;
  const sortColumn =
    orderByColumnId &&
    (metrics.some((entry) => entry.id === orderByColumnId) ||
      buckets.some((entry) => entry.id === orderByColumnId))
      ? orderByColumnId
      : metrics[0]?.id;
  if (!sortColumn) {
    return undefined;
  }
  return {
    sortColumn,
    direction,
    ...(size !== undefined ? { size } : {}),
  };
};
