/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ImportRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ParseImportFileResult {
  columns: string[];
  rows: ImportRow[];
  errors: ImportRowError[];
}

export interface ImportDatasetOption {
  id: string;
  name: string;
  examplesCount: number;
}

export type ImportFieldMapping = Record<string, 'input' | 'output' | 'metadata' | 'ignore'>;
