/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { GenericIndexPatternColumn, PersistedIndexPatternLayer } from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import type { AggsDataRequest } from '../types';
import type { LensAgg } from './metric_aggs';
import { METRIC_OPERATIONS, serializeAgg, toMetricAgg } from './metric_aggs';

/** A Lens column a table column fills, as Lens's `lens_map_to_columns` takes it. */
export type LensMappedColumn = GenericIndexPatternColumn & { id: string };

/** The request a form-based Lens layer runs, and the Lens columns each of its table columns fills. */
export interface CompiledLensLayer {
  request: AggsDataRequest;
  /** `esaggs` column ID → the Lens columns it fills, as Lens's `esAggsIdMap`. */
  idMap: Record<string, LensMappedColumn[]>;
}

/** Why a layer can't be compiled yet. */
export class UnsupportedLensColumnError extends Error {}

const unsupportedOperation = (operationType: string) =>
  new UnsupportedLensColumnError(
    i18n.translate('xpack.isomer.materialize.lensAggs.unsupportedOperation', {
      defaultMessage: 'Lens "{operationType}" columns on a data view cannot be materialized yet.',
      values: { operationType },
    })
  );

const unsupportedSetting = (operationType: string, setting: string) =>
  new UnsupportedLensColumnError(
    i18n.translate('xpack.isomer.materialize.lensAggs.unsupportedSetting', {
      defaultMessage:
        'Lens "{operationType}" columns with a {setting} on a data view cannot be materialized yet.',
      values: { operationType, setting },
    })
  );

/** The column's agg, or why it has none yet. */
const toAgg = (column: GenericIndexPatternColumn, aggId: string): LensAgg => {
  const { operationType } = column;
  if (!METRIC_OPERATIONS.has(operationType)) {
    throw unsupportedOperation(operationType);
  }
  if (column.filter) {
    throw unsupportedSetting(operationType, 'filter');
  }
  if (column.reducedTimeRange) {
    throw unsupportedSetting(operationType, 'reduced time range');
  }
  if (column.timeShift) {
    throw unsupportedSetting(operationType, 'time shift');
  }
  if (column.timeScale) {
    throw unsupportedSetting(operationType, 'time scale');
  }
  return toMetricAgg(column, aggId);
};

/** The agg ID in an `esaggs` column ID: `1` in `col-0-1` and `col-2-1.95`. */
const extractAggId = (id: string) => id.split('.')[0].split('-')[2];

/** Lens's `updatePositionIndex`: the column ID at a new position, keeping a percentile suffix. */
const updatePositionIndex = (currentId: string, newIndex: number) => {
  const [fullId, percentile, percentileDecimals] = currentId.split('.');
  const idParts = fullId.split('-');
  idParts[1] = String(newIndex);
  const suffix = !percentile
    ? ''
    : !percentileDecimals
    ? `.${percentile}`
    : `['${percentile}.${percentileDecimals}']`;
  return idParts.join('-') + suffix;
};

interface AggEntry extends LensAgg {
  esAggsId: string;
}

/** Points terms aggs ordered by `fromAggId` at `toAggId`, as Lens does when it merges aggs. */
const replaceOrderBy = (entries: AggEntry[], fromAggId: string, toAggId: string) => {
  for (const entry of entries) {
    if (entry.fn === 'aggTerms' && entry.args.orderBy === fromAggId) {
      entry.args = { ...entry.args, orderBy: toAggId };
    }
  }
};

const groupBy = (entries: AggEntry[], key: (entry: AggEntry) => string | undefined) => {
  const groups = new Map<string, AggEntry[]>();
  for (const entry of entries) {
    const groupKey = key(entry);
    if (groupKey) {
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), entry]);
    }
  }
  return [...groups.values()];
};

/** Lens's `dedupeAggs`: one agg per group key, filling every column the group's aggs filled. */
const dedupeAggs = (entries: AggEntry[], idMap: Record<string, LensMappedColumn[]>) => {
  let aggs = [...entries];
  for (const [first, ...rest] of groupBy(entries, ({ groupKey }) => groupKey)) {
    if (rest.length === 0) {
      continue;
    }
    aggs = aggs.filter((entry) => !rest.includes(entry));
    for (const { esAggsId } of rest) {
      idMap[first.esAggsId].push(...idMap[esAggsId]);
      delete idMap[esAggsId];
      replaceOrderBy(aggs, extractAggId(esAggsId), extractAggId(first.esAggsId));
    }
  }
  return aggs;
};

/**
 * The percentile operation's `optimizeEsAggs`: single percentiles of one field and time shift
 * become one `percentiles` agg, appended after the others, whose columns are `<id>.<percent>`.
 */
const mergePercentiles = (entries: AggEntry[], idMap: Record<string, LensMappedColumn[]>) => {
  let aggs = [...entries];
  const groups = groupBy(entries, ({ fn, args: { field, timeShift } }) =>
    fn === 'aggSinglePercentile' ? `${field}-${timeShift}` : undefined
  );
  for (const group of groups) {
    if (group.length <= 1) {
      continue;
    }
    aggs = aggs.filter((entry) => !group.includes(entry));
    const [{ args: first }] = group;
    for (const { args } of group) {
      replaceOrderBy(aggs, args.id, `${first.id}.${args.percentile}`);
    }
    aggs.push({
      fn: 'aggPercentiles',
      esAggsId: `col-?-${first.id}`,
      args: {
        id: first.id,
        enabled: first.enabled,
        schema: first.schema,
        field: first.field,
        percents: group.map(({ args }) => Number(args.percentile)),
        timeShift: first.timeShift,
      },
    });
    for (const { esAggsId, args } of group) {
      idMap[`col-?-${first.id}.${args.percentile}`] = idMap[esAggsId];
      delete idMap[esAggsId];
    }
  }
  return aggs;
};

/** The ID map with each column at its agg's place in the request, as tabify numbers columns. */
const renumber = (aggs: AggEntry[], idMap: Record<string, LensMappedColumn[]>) => {
  const renumbered: Record<string, LensMappedColumn[]> = {};
  const ids = Object.keys(idMap);
  let counter = 0;
  for (const { args } of aggs) {
    for (const id of ids.filter((esAggsId) => extractAggId(esAggsId) === args.id)) {
      renumbered[updatePositionIndex(id, counter)] = idMap[id];
      counter++;
    }
  }
  return renumbered;
};

const isMinOrMax = (column?: GenericIndexPatternColumn) =>
  column?.operationType === 'min' || column?.operationType === 'max';

/** Lens's `getSamplingValue`: no sampling when a min or max column, or a reference to one, is in the layer. */
const samplingProbability = ({ columns, sampling }: PersistedIndexPatternLayer) =>
  Object.values(columns).some(
    (column) =>
      isMinOrMax(column) || ('references' in column && isMinOrMax(columns[column.references[0]]))
  )
    ? 1
    : sampling ?? 1;

/**
 * The `aggs` request a form-based Lens layer runs, as Lens's `toExpression` builds its `esaggs`
 * call: one agg per column in column order, merged as `dedupeAggs` and the percentile
 * optimization merge them, and the ID map `lens_map_to_columns` renames the table's columns with.
 * Returns `undefined` for a layer without columns, and throws `UnsupportedLensColumnError` for a
 * column it can't compile yet.
 */
export const compileLensLayer = (
  layer: PersistedIndexPatternLayer,
  dataView: string | DataViewSpec
): CompiledLensLayer | undefined => {
  const { columnOrder, columns } = layer;
  if (columnOrder.length === 0) {
    return undefined;
  }
  const idMap: Record<string, LensMappedColumn[]> = {};
  const entries = columnOrder.map((columnId, index): AggEntry => {
    const column = columns[columnId];
    const aggId = String(index);
    const esAggsId = `col-${index}-${aggId}`;
    idMap[esAggsId] = [{ ...column, id: columnId }];
    return { ...toAgg(column, aggId), esAggsId };
  });

  const aggs = mergePercentiles(dedupeAggs(entries, idMap), idMap);
  const probability = samplingProbability(layer);

  return {
    request: {
      kind: 'aggs',
      dataView,
      aggs: aggs.map(serializeAgg),
      metricsAtAllLevels: false,
      partialRows: false,
      ...(probability !== 1 ? { probability } : {}),
      ...(layer.ignoreGlobalFilters ? { context: { ignoreGlobalFilters: true } } : {}),
    },
    idMap: renumber(aggs, idMap),
  };
};
