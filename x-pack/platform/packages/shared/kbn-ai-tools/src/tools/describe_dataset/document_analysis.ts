/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';

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
  samples: SearchHit[];
  fieldCaps: FieldCapsResponse;
}

export interface FormattedDocumentAnalysis {
  total: number;
  sampled: number;
  fields: Record<string, string[]>;
}
