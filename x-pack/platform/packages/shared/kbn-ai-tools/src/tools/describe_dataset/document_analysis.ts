/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DocumentAnalysisField {
  name: string;
  types: string[];
  cardinality: number | null;
  values: Array<{ value: string | number | boolean; count: number }>;
  empty: boolean;
  documentsWithValue: number;
}

export interface DocumentAnalysis {
  total: number;
  sampled: number;
  fields: DocumentAnalysisField[];
}

export interface FormattedDocumentAnalysis {
  total: number;
  sampled: number;
  fields: Record<string, string[]>;
}
