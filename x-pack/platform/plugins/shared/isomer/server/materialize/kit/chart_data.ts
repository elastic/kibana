/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { Cell, ChartData, Loss } from '@kbn/isomer';
import type { FormatMapper } from './formats';
import type {
  ChartColumnRole,
  ChartColumnType,
  KibanaColumnSource,
  KibanaTableSource,
} from './types';

export interface ToChartDataOptions {
  /** The columns to keep, in order. Defaults to every column of the table. */
  columns?: string[];
  /** Each column's role. Defaults to `metric` for numbers and `dimension` for the rest. */
  roles?: Record<string, ChartColumnRole>;
  /** Labels in place of the columns' names. */
  labels?: Record<string, string>;
  /** Overrides the time zone dates format in. Defaults to the context's, then `dateFormat:tz`. */
  timeZone?: string;
}

export interface ChartDataResult {
  data: ChartData;
  losses: Loss[];
}

type ScalarCell = Exclude<Cell, Cell[]>;

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const columnType = ({ meta }: DatatableColumn): ChartColumnType => {
  switch (meta.type) {
    case 'number':
    case 'date':
    case 'boolean':
      return meta.type;
    default:
      return 'string';
  }
};

const matches = (type: ChartColumnType, value: unknown): value is ScalarCell => {
  if (value === null) {
    return true;
  }
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return (
        (typeof value === 'number' && Number.isFinite(value)) ||
        (typeof value === 'string' && ISO_DATE_TIME.test(value))
      );
    default:
      return typeof value === 'string';
  }
};

const asString = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const flatten = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

/**
 * Turns a Kibana `Datatable` into a chart's columnar `data`, unreordered: rows and columns keep
 * the table's order and raw values, and each column carries the `Datatable` column it came from.
 * Formats map to portable formats; anything that can't is pre-rendered or recorded in losses.
 */
export const toChartData = (
  table: Datatable,
  mapFormat: FormatMapper,
  defaultTimeZone: string | undefined,
  { columns: kept, roles = {}, labels = {}, timeZone = defaultTimeZone }: ToChartDataOptions = {}
): ChartDataResult => {
  const byId = new Map(table.columns.map((column) => [column.id, column]));
  const tableColumns = kept
    ? kept.map((id) => {
        const column = byId.get(id);
        if (!column) {
          throw new Error(`The table has no column "${id}".`);
        }
        return column;
      })
    : table.columns;

  const losses: Loss[] = [];
  const display: Record<string, string[]> = {};
  const values = tableColumns.map(({ id }) =>
    table.rows.map((row) => (row[id] === undefined ? null : row[id]))
  );

  const columns = tableColumns.map((column, index) => {
    const path = `data.columns[${index}]`;
    const raw = values[index];
    const multivalue = raw.some(Array.isArray);
    let type = columnType(column);

    if (!raw.every((value) => flatten(value).every((cell) => matches(type, cell)))) {
      losses.push({
        path: `${path}.type`,
        kind: 'approximated',
        note: i18n.translate('xpack.isomer.materialize.chartData.mixedTypes', {
          defaultMessage:
            'Some "{column}" values are not {type} values, so the column holds strings.',
          values: { column: column.name, type },
        }),
      });
      type = 'string';
      values[index] = raw.map((value) =>
        Array.isArray(value) ? value.map(asString) : asString(value)
      );
    }

    const mapping = mapFormat(column.meta.params, columnType(column), timeZone);
    const hasLabels = raw.some((value) =>
      flatten(value).some((cell) => typeof cell === 'string' && mapping.labels?.[cell])
    );
    if (mapping.prerender || hasLabels) {
      display[column.id] = raw.map((value) =>
        flatten(value)
          .map((cell) =>
            typeof cell === 'string' && mapping.labels?.[cell]
              ? mapping.labels[cell]
              : mapping.toText(cell)
          )
          .join(', ')
      );
      losses.push({
        path: `${path}.format`,
        kind: 'prerendered',
        note:
          mapping.prerender ??
          i18n.translate('xpack.isomer.materialize.chartData.bucketLabels', {
            defaultMessage: '"{column}" shows the bucket labels Kibana sets.',
            values: { column: column.name },
          }),
      });
    }
    if (mapping.approximated) {
      losses.push({ path: `${path}.format`, kind: 'approximated', note: mapping.approximated });
    }
    if (mapping.dropped) {
      losses.push({ path: `${path}.format`, kind: 'dropped', note: mapping.dropped });
    }

    const source: KibanaColumnSource = { kind: 'kibana-datatable-column', column };
    return {
      id: column.id,
      label: labels[column.id] ?? column.name,
      type,
      role: roles[column.id] ?? (type === 'number' ? 'metric' : 'dimension'),
      ...(mapping.format && type === columnType(column) ? { format: mapping.format } : {}),
      ...(multivalue ? { multivalue: true as const } : {}),
      source,
    };
  });

  const tableSource: KibanaTableSource = {
    kind: 'kibana-datatable',
    ...(table.meta ? { meta: table.meta } : {}),
  };
  return {
    data: {
      columns,
      rows: table.rows.map((_, rowIndex) =>
        values.map((columnValues) => columnValues[rowIndex] as Cell)
      ),
      ...(Object.keys(display).length > 0 ? { display } : {}),
      source: tableSource,
    },
    losses,
  };
};
