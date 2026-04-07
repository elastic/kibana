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
}

export interface ResultFormatter {
  opening: (metadata: ExportMetadata) => string | null;
  row: (record: Record<string, unknown>, isFirst: boolean) => string;
  closing: () => string | null;
  contentType: string;
  fileExtension: string;
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

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Quote if the field contains comma, double-quote, newline, or carriage return
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

export function createCsvFormatter(): ResultFormatter {
  let columns: string[] | null = null;

  return {
    contentType: 'text/csv',
    fileExtension: 'csv',
    opening(metadata) {
      const lines = [
        `# Action ID: ${metadata.action_id}`,
        metadata.query ? `# Query: ${metadata.query.replace(/\n/g, ' ')}` : null,
        `# Exported: ${metadata.timestamp}`,
        `# Exported By: ${metadata.exported_by}`,
        metadata.total_results != null ? `# Total Results: ${metadata.total_results}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      return lines + '\n';
    },
    row(record, isFirst) {
      if (isFirst || !columns) {
        columns = Object.keys(record);
        const header = columns.map(escapeCsvField).join(',') + '\n';
        const row = columns.map((col) => escapeCsvField(record[col])).join(',') + '\n';

        return header + row;
      }

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
  }
}
