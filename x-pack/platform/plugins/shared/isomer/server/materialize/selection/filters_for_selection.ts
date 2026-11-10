/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, uniqWith } from 'lodash';
import type { AggConfigSerialized, AggsCommonStart } from '@kbn/data-plugin/common';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter, RangeFilterParams } from '@kbn/es-query';
import {
  COMPARE_ALL_OPTIONS,
  buildRangeFilter,
  compareFilters,
  toggleFilterNegated,
} from '@kbn/es-query';
import {
  buildPhraseFilter,
  buildPhrasesFilter,
  buildSimpleExistFilter,
  buildSimpleNumberRangeFilter,
} from '@kbn/es-query/src/filters/build_filters';
import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/common';
import { isSourceParamsESQL } from '@kbn/expressions-plugin/common/expression_types';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import { i18n } from '@kbn/i18n';
import type { ChartEvent, MaterializedNode } from '../nodes';
import { isChartNode } from '../nodes';
import { isKibanaColumnSource, isKibanaTableSource } from '../kit/types';

/** The user-scoped services selections resolve against. */
export interface SelectionServices {
  dataViews: Pick<DataViewsService, 'get' | 'getFieldsForWildcard'>;
  aggs: Pick<AggsCommonStart, 'createAggConfigs'>;
}

const OTHER_BUCKET = '__other__';

/** Raised for a selection that doesn't fit its node. */
export class SelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SelectionError';
  }
}

const selectionError = (message: string) => new SelectionError(message);

/** The Kibana `Datatable` a chart node's data came from, rebuilt from its column sources. */
export const tableFromNode = (node: MaterializedNode): Datatable => {
  if (!isChartNode(node)) {
    throw selectionError(
      i18n.translate('xpack.isomer.selection.notChart', {
        defaultMessage: 'A "{type}" node has no data to select.',
        values: { type: node.type },
      })
    );
  }
  const { columns, rows, source } = node.data;
  const tableColumns = columns.map(({ id, source: columnSource }) => {
    if (!isKibanaColumnSource(columnSource)) {
      throw selectionError(
        i18n.translate('xpack.isomer.selection.noColumnSource', {
          defaultMessage: 'Column "{id}" did not come from a Kibana table.',
          values: { id },
        })
      );
    }
    return columnSource.column;
  });
  return {
    type: 'datatable',
    columns: tableColumns,
    rows: rows.map((row) =>
      Object.fromEntries(tableColumns.map(({ id }, index) => [id, row[index]]))
    ) as DatatableRow[],
    ...(isKibanaTableSource(source) && source.meta ? { meta: source.meta } : {}),
  };
};

/** The values of the column at `columnIndex` in the rows that match `rowIndex` in every earlier column, as Kibana collects them for an Other bucket. */
const otherBucketTerms = (table: Datatable, columnIndex: number, rowIndex: number) => {
  const rows = table.rows.filter((row) =>
    table.columns.every(
      (column, index) => index >= columnIndex || row[column.id] === table.rows[rowIndex][column.id]
    )
  );
  return [
    ...new Set(
      rows
        .map((row) => row[table.columns[columnIndex].id])
        .filter((term) => String(term) !== OTHER_BUCKET && String(term) !== MISSING_TOKEN)
    ),
  ];
};

const aggConfigFor = async (
  table: Datatable,
  columnIndex: number,
  { dataViews, aggs }: SelectionServices
) => {
  const { meta } = table.columns[columnIndex];
  const sourceParams = meta.sourceParams as
    | (AggConfigSerialized & { indexPatternId?: string })
    | undefined;
  if (meta.source !== 'esaggs' || !sourceParams?.indexPatternId) {
    return undefined;
  }
  const { indexPatternId, ...aggConfigParams } = sourceParams;
  const dataView = await dataViews.get(indexPatternId);
  return { dataView, aggConfig: aggs.createAggConfigs(dataView, [aggConfigParams]).aggs[0] };
};

/** A bucket cell's filters, as Kibana's value click builds them for a data view table. */
const aggsCellFilters = async (
  table: Datatable,
  columnIndex: number,
  rowIndex: number,
  services: SelectionServices
): Promise<Filter[]> => {
  const resolved = await aggConfigFor(table, columnIndex, services);
  const value = table.rows[rowIndex]?.[table.columns[columnIndex].id];
  if (!resolved || value == null || !resolved.aggConfig.isFilterable()) {
    return [];
  }
  const { aggConfig } = resolved;
  const filter =
    (aggConfig.type.name === 'terms' || aggConfig.type.name === 'multi_terms') &&
    aggConfig.params.otherBucket
      ? aggConfig.createFilter(value, { terms: otherBucketTerms(table, columnIndex, rowIndex) })
      : aggConfig.createFilter(value);
  return filter ? castArray(filter) : [];
};

/** A field of an ES|QL query's index pattern, when it exists and can be filtered on. */
const esqlField = async (indexPattern: string, name: string, { dataViews }: SelectionServices) => {
  const [spec] = await dataViews.getFieldsForWildcard({ pattern: indexPattern, fields: [name] });
  const field = spec?.name === name ? new DataViewField(spec) : undefined;
  return field?.filterable ? field : undefined;
};

/** An ES|QL cell's filters, as Kibana's value click builds them for an ES|QL table. */
const esqlCellFilters = async (
  table: Datatable,
  columnIndex: number,
  rowIndex: number,
  services: SelectionServices
): Promise<Filter[]> => {
  const column = table.columns[columnIndex];
  const { sourceParams } = column.meta;
  if (
    !sourceParams ||
    !isSourceParamsESQL(sourceParams) ||
    !sourceParams.sourceField ||
    sourceParams.sourceField === '___records___'
  ) {
    return [];
  }
  const { indexPattern, sourceField, operationType, interval } = sourceParams;
  const value = table.rows[rowIndex]?.[column.id];

  if (operationType === 'date_histogram' || operationType === 'histogram') {
    if (value == null) {
      return [];
    }
    const isDate = operationType === 'date_histogram';
    return [
      buildSimpleNumberRangeFilter(
        sourceField,
        isDate ? 'date' : 'number',
        {
          gte: value,
          lt: value + (interval ?? 0),
          ...(isDate ? { format: 'strict_date_optional_time' } : {}),
        },
        value,
        indexPattern
      ),
    ];
  }
  if (operationType) {
    return value == null ? [] : [buildSimpleExistFilter(sourceField, indexPattern)];
  }

  const isComputed =
    column.isComputedColumn === true && sourceParams.isSourceFieldFilterable !== true;
  const fieldName = typeof sourceField === 'string' ? sourceField : column.name;
  if (isComputed || !indexPattern) {
    return [];
  }
  const field = await esqlField(indexPattern, fieldName, services);
  if (!field) {
    return [];
  }
  const dataView = { id: indexPattern, title: indexPattern, fields: [field] };
  if (value == null) {
    const exists = buildSimpleExistFilter(fieldName, indexPattern);
    exists.meta.negate = true;
    return [exists];
  }
  const descriptor = { name: fieldName, type: column.meta.type };
  return [
    Array.isArray(value)
      ? buildPhrasesFilter(descriptor, value, dataView)
      : buildPhraseFilter(descriptor, value, dataView),
  ];
};

const columnIndexOf = (table: Datatable, id: string): number => {
  const index = table.columns.findIndex((column) => column.id === id);
  if (index === -1) {
    throw selectionError(
      i18n.translate('xpack.isomer.selection.noColumn', {
        defaultMessage: 'The selection names column "{id}", which the node does not have.',
        values: { id },
      })
    );
  }
  return index;
};

const brushFilters = async (
  table: Datatable,
  columnIndex: number,
  [min, max]: [number, number],
  services: SelectionServices
): Promise<Filter[]> => {
  if (min === max) {
    return [];
  }
  const column = table.columns[columnIndex];
  let field: { name: string; type: string } | undefined;
  let dataView: DataView | undefined;
  if (table.meta?.type === 'es_ql') {
    const { sourceParams } = column.meta;
    const name =
      (sourceParams && isSourceParamsESQL(sourceParams) && sourceParams.sourceField) || column.name;
    field = { name: String(name), type: column.meta.type ?? 'unknown' };
  } else {
    const resolved = await aggConfigFor(table, columnIndex, services);
    field = resolved?.aggConfig.params.field;
    dataView = resolved?.dataView;
  }
  if (!field) {
    return [];
  }
  const isDate = field.type === 'date';
  const params: RangeFilterParams = {
    gte: isDate ? new Date(min).toISOString() : min,
    lt: isDate ? new Date(max).toISOString() : max,
    ...(isDate ? { format: 'strict_date_optional_time' } : {}),
  };
  return [buildRangeFilter(field, params, dataView)];
};

/**
 * The Kibana filters a selection on `node` stands for, built as Kibana's value click and range
 * select actions build them, from the `Datatable` the node's column sources describe.
 */
export const filtersForSelection = async (
  event: ChartEvent,
  node: MaterializedNode,
  services: SelectionServices
): Promise<Filter[]> => {
  const table = tableFromNode(node);

  if (event.kind === 'brush') {
    return brushFilters(table, columnIndexOf(table, event.column), event.range, services);
  }

  const [rowIndex] = event.rows;
  const cellFilters = table.meta?.type === 'es_ql' ? esqlCellFilters : aggsCellFilters;
  const filters: Filter[] = [];
  for (const id of event.columns) {
    const built = await cellFilters(table, columnIndexOf(table, id), rowIndex, services);
    filters.push(...built.map((filter) => (event.negate ? toggleFilterNegated(filter) : filter)));
  }
  return uniqWith(filters, (a, b) => compareFilters(a, b, COMPARE_ALL_OPTIONS));
};
