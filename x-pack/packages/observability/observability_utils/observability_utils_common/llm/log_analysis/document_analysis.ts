/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DocumentAnalysis {
  total: number;
  sampled: number;
  fields: Array<{
    name: string;
    types: string[];
    cardinality: number | null;
    values: Array<string | number | boolean>;
    empty: boolean;
  }>;
}

export interface TruncatedDocumentAnalysis {
  fields: string[];
  total: number;
  sampled: number;
}
