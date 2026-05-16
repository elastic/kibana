/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExportFormat = 'ndjson' | 'json' | 'csv';

export interface ExportMetadata {
  action_id: string;
  query?: string;
  timestamp: string;
  exported_by: string;
  format: ExportFormat;
  total_results?: number;
  /** Schedule execution count — only set for scheduled-query exports. */
  execution_count?: number;
  /**
   * When set (CSV + ECS mapping + zero hits), `opening` emits this header row so
   * an empty export is not a 0-byte file. Column order matches `flattenOsqueryHit`.
   */
  csv_columns?: string[];
}

export interface ResultFormatter {
  opening: (metadata: ExportMetadata) => string | null;
  row: (record: Record<string, unknown>, isFirst: boolean) => string;
  closing: () => string | null;
  contentType: string;
  fileExtension: string;
  /**
   * Optional pre-scan hook. Called once with all first-page records before any
   * bytes are written so the formatter can compute stable state (e.g. the CSV
   * column union) from more than just row 1. Heterogeneous osquery tables
   * across agents frequently have columns that only appear in later rows, so
   * a single-row capture would silently drop fields.
   */
  finalizeColumns?: (firstPageRecords: Array<Record<string, unknown>>) => void;
}

// --- NDJSON ---

export function createNdjsonFormatter(): ResultFormatter {
  return {
    contentType: 'application/ndjson',
    fileExtension: 'ndjson',
    opening(metadata) {
      return JSON.stringify({ _meta: metadata }) + '\n';
    },
    row(record) {
      return JSON.stringify(record) + '\n';
    },
    closing() {
      return null;
    },
  };
}

// --- JSON ---

export function createJsonFormatter(): ResultFormatter {
  return {
    contentType: 'application/json',
    fileExtension: 'json',
    opening(metadata) {
      return `{"_meta":${JSON.stringify(metadata)},"results":[\n`;
    },
    row(record, isFirst) {
      const line = JSON.stringify(record);

      return isFirst ? line + '\n' : ',' + line + '\n';
    },
    closing() {
      return ']}\n';
    },
  };
}

// --- CSV ---

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Prefix cells that start with formula-trigger characters to prevent
  // spreadsheet applications from interpreting them as formulas.
  if (FORMULA_TRIGGERS.test(str)) {
    str = `'${str}`;
  }

  // Quote if the field contains comma, double-quote, newline, carriage return, or tab
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes('\t')
  ) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

export function createCsvFormatter(): ResultFormatter {
  let columns: string[] | null = null;

  return {
    contentType: 'text/csv',
    fileExtension: 'csv',
    finalizeColumns(firstPageRecords) {
      const seen = new Set<string>();
      const union: string[] = [];
      // Preserve insertion order — first occurrence wins — so the column
      // ordering matches the first row's shape with extras appended.
      for (const record of firstPageRecords) {
        for (const key of Object.keys(record)) {
          if (!seen.has(key)) {
            seen.add(key);
            union.push(key);
          }
        }
      }

      columns = union;
    },
    opening(metadata) {
      if (
        metadata.format === 'csv' &&
        metadata.total_results === 0 &&
        metadata.csv_columns &&
        metadata.csv_columns.length > 0
      ) {
        columns = [...metadata.csv_columns];

        return metadata.csv_columns.map(escapeCsvField).join(',') + '\n';
      }

      return null;
    },
    row(record, isFirst) {
      if (isFirst) {
        if (!columns) columns = Object.keys(record);
        const header = columns.map(escapeCsvField).join(',') + '\n';
        const row = columns.map((col) => escapeCsvField(record[col])).join(',') + '\n';

        return header + row;
      }

      if (!columns) columns = Object.keys(record);

      return columns.map((col) => escapeCsvField(record[col])).join(',') + '\n';
    },
    closing() {
      return null;
    },
  };
}

export function createFormatter(format: ExportFormat): ResultFormatter {
  switch (format) {
    case 'ndjson':
      return createNdjsonFormatter();
    case 'json':
      return createJsonFormatter();
    case 'csv':
      return createCsvFormatter();
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported export format: ${String(exhaustive)}`);
    }
  }
}
