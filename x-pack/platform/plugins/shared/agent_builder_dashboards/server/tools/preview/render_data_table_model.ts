/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { ColumnState } from '@kbn/lens-common';
import {
  LensConfigBuilder,
  datatableConfigSchemaESQL,
  type DatatableConfigESQL,
} from '@kbn/lens-embeddable-utils';
import { DATE_TYPES, NUMBER_TYPES, getColumnType, toRows } from './preview_table';
import type { PreviewContext, PreviewPanelConfig, PreviewTable } from './types';
import { getValueFormatter } from './value_format';
import { getCellColorFn, type CellColorFn } from './render_data_table_color';

/** The Lens API data table config (ES|QL variant), with the schema defaults applied. */
export type DataTableConfig = DatatableConfigESQL;
type RowConfig = NonNullable<DataTableConfig['rows']>[number];
type MetricConfig = NonNullable<DataTableConfig['metrics']>[number];
type SplitConfig = NonNullable<DataTableConfig['split_metrics_by']>[number];
type CollapseFunction = NonNullable<RowConfig['collapse_by']>;
type SummaryType = NonNullable<MetricConfig['summary']>['type'];

export type Alignment = 'left' | 'center' | 'right';
/** How a column shows its colors: none, cell background, text or badge. */
export type ColorMode = 'none' | 'cell' | 'text' | 'badge';

/** One column of the drawn grid, after rows are collapsed and metrics pivoted. */
export interface GridColumn {
  name: string;
  alignment: Alignment;
  /** The configured width in pixels, if any. */
  width?: number;
  colorMode: ColorMode;
  /** Whether cells are one-click filter links. */
  isLink: boolean;
  /** The text of a raw value (field format `convertToText`), e.g. "(null)" or "(blank)". */
  formatText: (value: unknown) => string;
  /** The text of a cell, which shows a multi-value as `[a, b]`. */
  formatCell: (value: unknown) => string;
  /** The cell color, when the column applies color. */
  getColor?: CellColorFn;
  summary?: string;
}

export interface DataTableModel {
  columns: GridColumn[];
  /** Raw cell values, one array per grid row, in column order. */
  rows: unknown[][];
  /** The column the rows are sorted by, which shows a sort arrow. */
  sort?: { columnIndex: number; direction: 'asc' | 'desc' };
}

const MISSING_TOKEN = '__missing__';
const NULL_LABEL = '(null)';
const EMPTY_LABEL = '(blank)';
const TRANSPOSE_SEPARATOR = '›';
const ROW_ACCESSOR = 'datatable_accessor_row';
const METRIC_ACCESSOR = 'datatable_accessor_metric';
const formatNumber = getValueFormatter(undefined);
const SUMMARY_LABELS: Record<SummaryType, string> = {
  sum: 'Sum',
  count: 'Value count',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
};
const COLOR_MODES = { value: 'text', background: 'cell', badge: 'badge' } as const;

/** Whether a value shows as an empty placeholder: a dash for missing values, "(blank)" for ''. */
export const isEmptyValue = (value: unknown): boolean =>
  value == null ||
  value === MISSING_TOKEN ||
  value === '' ||
  (typeof value === 'number' && Number.isNaN(value));

export const isMissingValue = (value: unknown): boolean => value == null || value === MISSING_TOKEN;

/** A panel config as the preview gets it, before it is validated. */
export type DataTablePanelConfig = PreviewPanelConfig & {
  data_source?: { type?: string; query?: string };
};

/** Validates a data table config against the Lens API schema, which also applies its defaults. */
export const parseDataTableConfig = (config: DataTablePanelConfig): DataTableConfig => {
  const result = datatableConfigSchemaESQL.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`);
    throw new Error(`The data table config is not valid: ${issues.join('; ')}`);
  }
  return result.data;
};

const isColumnStateList = (columns: unknown): columns is ColumnState[] => Array.isArray(columns);

// The Lens column states of the config, by accessor, from the real API -> Lens state transform.
const getLensColumns = (config: DataTableConfig): Map<string, ColumnState> => {
  const { visualization } = new LensConfigBuilder().fromAPIFormat(config).state;
  const columns =
    typeof visualization === 'object' && visualization !== null && 'columns' in visualization
      ? visualization.columns
      : [];
  return new Map(
    (isColumnStateList(columns) ? columns : []).map((column) => [column.columnId, column])
  );
};

// Field formats: numbers by the column format, dates by Kibana's `dateFormat` in its time zone,
// '' as "(blank)" and missing values as "(null)". Multi-values are listed like the field formats
// do: JSON in text, `[a, b]` in table cells.
const getFormatters = (
  type: string | undefined,
  format: RowConfig['format'],
  { timeZone, dateFormat }: PreviewContext
) => {
  const formatNumberValue = getValueFormatter(format);
  const formatOne = (value: unknown): string => {
    if (isMissingValue(value)) return NULL_LABEL;
    if (value === '') return EMPTY_LABEL;
    if (typeof value === 'number' && NUMBER_TYPES.has(type ?? '')) return formatNumberValue(value);
    if (typeof value === 'number' && DATE_TYPES.has(type ?? '')) {
      return moment.tz(value, timeZone).format(dateFormat);
    }
    return String(value);
  };
  const formatText = (value: unknown): string =>
    Array.isArray(value) && value.length !== 1
      ? JSON.stringify(value.map(formatOne))
      : formatOne(Array.isArray(value) ? value[0] : value);
  const formatCell = (value: unknown): string => {
    if (!Array.isArray(value)) return formatOne(value);
    return value.length === 1 ? formatOne(value[0]) : `[${value.map(formatOne).join(', ')}]`;
  };
  return { formatText, formatCell };
};

const toNumbers = (value: unknown): number[] =>
  (Array.isArray(value) ? value : [value]).map(Number);

// `lens_collapse`: one row per combination of the `by` values, with every metric aggregated.
const collapseRows = (
  rows: Array<Record<string, unknown>>,
  by: string[],
  metrics: string[],
  fn: CollapseFunction
): Array<Record<string, unknown>> => {
  const groups = new Map<string, Array<Record<string, unknown>>>();
  rows.forEach((row) => {
    const key = JSON.stringify(by.map((column) => row[column] ?? null));
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.values()].map((group) => {
    const collapsed: Record<string, unknown> = {};
    by.forEach((column) => {
      collapsed[column] = group[0][column];
    });
    metrics.forEach((column) => {
      const numbers = group.flatMap((row) => (row[column] == null ? [] : toNumbers(row[column])));
      if (!numbers.length) return;
      const sum = numbers.reduce((total, value) => total + value, 0);
      collapsed[column] =
        fn === 'sum'
          ? sum
          : fn === 'avg'
          ? sum / numbers.length
          : fn === 'min'
          ? Math.min(...numbers)
          : Math.max(...numbers);
    });
    return collapsed;
  });
};

const computeSummary = (type: SummaryType, values: unknown[]) => {
  const numbers = values.filter((value) => value != null).flatMap(toNumbers);
  const sum = numbers.reduce((total, value) => total + value, 0);
  switch (type) {
    case 'sum':
      return sum;
    case 'count':
      return numbers.length;
    case 'avg':
      return sum / numbers.length;
    case 'min':
      return Math.min(...numbers);
    case 'max':
      return Math.max(...numbers);
  }
};

// Lens sorts numbers numerically and text alphabetically, with missing values last.
const compareValues = (a: unknown, b: unknown, direction: 'asc' | 'desc') => {
  if (isMissingValue(a) || isMissingValue(b)) {
    return Number(isMissingValue(a)) - Number(isMissingValue(b));
  }
  const order =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return direction === 'desc' ? -order : order;
};

const crossProduct = (lists: string[][]): string[][] =>
  lists.reduce<string[][]>(
    (combos, list) => combos.flatMap((combo) => list.map((value) => [...combo, value])),
    [[]]
  );

interface SourceRow {
  values: Record<string, unknown>;
  /** The data rows of a pivoted grid row, by pivot key. */
  pivots: Map<string, Record<string, unknown>>;
}

interface ModelColumn {
  name: string;
  config: RowConfig | MetricConfig;
  /** The Lens accessor of the API column, e.g. `datatable_accessor_metric_0`. */
  accessor: string;
  isMetric: boolean;
  /** Pivot values of a split metric column, outer split first. */
  pivot?: string[];
  read: (row: SourceRow) => unknown;
}

/**
 * Turns a Lens API data table config and its ES|QL result into the grid Lens draws: rows
 * collapsed by `collapse_by` (`lens_collapse`), row columns then metric columns, metrics pivoted
 * by `split_metrics_by` (`transposeTable`), sorted by `sort_by`, without hidden columns, with
 * value formats, cell colors, links and summary values.
 */
export const buildDataTableModel = (
  config: DataTableConfig,
  table: PreviewTable,
  context: PreviewContext
): DataTableModel => {
  const hasColumn = ({ column }: { column: string }) => getColumnType(table, column) !== undefined;
  const isNumericColumn = (column: string) => NUMBER_TYPES.has(getColumnType(table, column) ?? '');
  const indexed = <T extends { column: string }>(configs: T[] = [], accessor: string) =>
    configs
      .map((columnConfig, index) => ({ columnConfig, accessor: `${accessor}_${index}` }))
      .filter(({ columnConfig }) => hasColumn(columnConfig));
  const allRows = indexed<RowConfig>(config.rows, ROW_ACCESSOR);
  const metricConfigs = indexed<MetricConfig>(config.metrics, METRIC_ACCESSOR);
  const splitConfigs: SplitConfig[] = (config.split_metrics_by ?? []).filter(hasColumn);
  const formatters = new Map(
    [
      ...allRows.map(({ columnConfig }) => columnConfig),
      ...metricConfigs.map(({ columnConfig }) => columnConfig),
      ...splitConfigs,
    ].map(({ column, format }) => [
      column,
      getFormatters(getColumnType(table, column), format, context),
    ])
  );
  const toText = (column: string, value: unknown) =>
    formatters.get(column)?.formatText(value) ?? NULL_LABEL;

  // Collapsed row columns are aggregated away: the other text columns group the rows and every
  // numeric column is aggregated, one collapsed column after the other.
  let dataRows = toRows(table);
  const collapsed = allRows.filter(({ columnConfig }) => columnConfig.collapse_by);
  const shownColumns = [
    ...allRows.map(({ columnConfig: { column } }) => column),
    ...splitConfigs.map(({ column }) => column),
    ...metricConfigs.map(({ columnConfig: { column } }) => column),
  ];
  collapsed.forEach(({ columnConfig: { column: collapsedColumn, collapse_by: fn } }) => {
    if (!fn) return;
    const others = shownColumns.filter((column) => column !== collapsedColumn);
    dataRows = collapseRows(
      dataRows,
      others.filter((column) => !isNumericColumn(column)),
      shownColumns.filter(isNumericColumn),
      fn
    );
  });
  const rowConfigs = allRows.filter(({ columnConfig }) => !columnConfig.collapse_by);

  let rows: SourceRow[] = dataRows.map((values) => ({ values, pivots: new Map() }));
  let modelColumns: ModelColumn[] = [
    ...rowConfigs.map(({ columnConfig, accessor }) => ({
      name: columnConfig.label ?? columnConfig.column,
      config: columnConfig,
      accessor,
      isMetric: false,
      read: ({ values }: SourceRow) => values[columnConfig.column],
    })),
    ...metricConfigs.map(({ columnConfig, accessor }) => ({
      name: columnConfig.label ?? columnConfig.column,
      config: columnConfig,
      accessor,
      isMetric: true,
      read: ({ values }: SourceRow) => values[columnConfig.column],
    })),
  ];

  if (splitConfigs.length && metricConfigs.length) {
    // One grid row per combination of row values, one column per pivot value and metric.
    const pivotKey = (row: Record<string, unknown>) =>
      JSON.stringify(splitConfigs.map(({ column }) => toText(column, row[column])));
    const groups = new Map<string, Array<Record<string, unknown>>>();
    dataRows.forEach((row) => {
      const key = JSON.stringify(
        rowConfigs.map(({ columnConfig: { column } }) => toText(column, row[column]))
      );
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    rows = [...groups.values()].map((group) => ({
      values: group[0],
      pivots: new Map(group.map((row) => [pivotKey(row), row])),
    }));
    const uniqueValues = splitConfigs.map(({ column }) => [
      ...new Set(dataRows.map((row) => toText(column, row[column]))),
    ]);
    modelColumns = [
      ...modelColumns.filter(({ isMetric }) => !isMetric),
      ...crossProduct(uniqueValues).flatMap((pivot) =>
        metricConfigs.map(({ columnConfig, accessor }) => ({
          name: [...pivot, columnConfig.label ?? columnConfig.column].join(
            ` ${TRANSPOSE_SEPARATOR} `
          ),
          config: columnConfig,
          accessor,
          isMetric: true,
          pivot,
          read: ({ pivots }: SourceRow) => pivots.get(JSON.stringify(pivot))?.[columnConfig.column],
        }))
      ),
    ];
  }

  const sortBy = config.styling?.sort_by;
  let sortColumn: ModelColumn | undefined;
  if (sortBy) {
    const sortAccessor = `${sortBy.column_type === 'row' ? ROW_ACCESSOR : METRIC_ACCESSOR}_${
      sortBy.index
    }`;
    sortColumn = modelColumns.find(
      ({ accessor, pivot }) =>
        accessor === sortAccessor &&
        (sortBy.column_type === 'pivoted_metric'
          ? JSON.stringify(pivot) === JSON.stringify(sortBy.values)
          : pivot === undefined)
    );
    const read = sortColumn?.read;
    if (read) {
      rows = [...rows].sort((a, b) => compareValues(read(a), read(b), sortBy.direction));
    }
  }

  const visibleColumns = modelColumns.filter(({ config: { visible } }) => visible !== false);
  const gridRows = rows.map((row) => visibleColumns.map(({ read }) => read(row)));

  // Colors use every value of the original column in data order, across pivoted columns.
  const lensColumns = getLensColumns(config);
  const colorFns = new Map<string, CellColorFn>();
  const getColorFn = ({ accessor, config: { column } }: ModelColumn) => {
    const colorFn =
      colorFns.get(accessor) ??
      getCellColorFn({
        column: lensColumns.get(accessor),
        isNumeric: isNumericColumn(column),
        values: dataRows.map((row) => row[column]),
      });
    colorFns.set(accessor, colorFn);
    return colorFn;
  };

  const columns = visibleColumns.map((modelColumn, index): GridColumn => {
    const { name, config: columnConfig, isMetric } = modelColumn;
    const { column, alignment, width, apply_color_to: applyColorTo } = columnConfig;
    const isNumeric = isNumericColumn(column);
    const { formatText, formatCell } =
      formatters.get(column) ?? getFormatters('', undefined, context);
    const summary = 'summary' in columnConfig ? columnConfig.summary : undefined;
    let summaryText: string | undefined;
    if (isMetric && isNumeric && summary) {
      const value = computeSummary(
        summary.type,
        gridRows.map((row) => row[index])
      );
      const text = summary.type === 'count' ? formatNumber(value) : formatText(value);
      const label = summary.label ?? SUMMARY_LABELS[summary.type];
      summaryText = label === '' ? text : `${label}: ${text}`;
    }
    return {
      name,
      alignment: alignment ?? (isNumeric ? 'right' : 'left'),
      width,
      colorMode: applyColorTo ? COLOR_MODES[applyColorTo] : 'none',
      isLink: 'click_filter' in columnConfig && columnConfig.click_filter === true,
      formatText,
      formatCell,
      getColor: applyColorTo ? getColorFn(modelColumn) : undefined,
      summary: summaryText,
    };
  });

  const sortColumnIndex = sortColumn ? visibleColumns.indexOf(sortColumn) : -1;
  return {
    columns,
    rows: gridRows,
    sort:
      sortBy && sortColumnIndex >= 0
        ? { columnIndex: sortColumnIndex, direction: sortBy.direction }
        : undefined,
  };
};
