/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCsv } from '../../common/csv';
import type { EsqlResponse, ExportFormat } from '../../common/types';

export interface ExportFile {
  readonly body: string;
  readonly contentType: string;
  readonly filename: string;
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

function toFilename(name: string, format: ExportFormat): string {
  const safeName = name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 100) || 'export';
  return `${safeName}.${format}`;
}

/** Serializes ES|QL results; JSON rows are objects keyed by column name. */
export function esqlToFile(
  name: string,
  { columns, values }: EsqlResponse,
  format: ExportFormat
): ExportFile {
  const names = columns.map((column) => column.name);
  const body =
    format === 'csv'
      ? toCsv(names, values)
      : JSON.stringify(
          {
            columns,
            rows: values.map((row) =>
              Object.fromEntries(names.map((column, position) => [column, row[position]]))
            ),
          },
          null,
          2
        );
  return { body, contentType: CONTENT_TYPES[format], filename: toFilename(name, format) };
}
