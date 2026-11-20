/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EvidenceFieldKind = 'keyword' | 'ip' | 'numeric' | 'date' | 'geo_point' | 'text';

export interface EvidenceField {
  name: string;
  kind: EvidenceFieldKind;
  /** Distinct values in the time range. Only for keyword and ip fields. */
  cardinality?: number;
  /** Fraction of documents without a value. Only for numeric fields. */
  nullRate?: number;
  numericStats?: { min: number; max: number; avg: number };
  /** The most frequent values. Only for keyword fields. */
  topValues?: string[];
}

export interface RecognizerModuleHit {
  id: string;
  title: string;
  description: string;
}

export interface IndexEvidence {
  index: string;
  timeField: string;
  timeRange: { start: number; end: number };
  docCount: number;
  /** Fraction of time buckets in the range which contain no documents. */
  emptyBucketFraction: number;
  fields: EvidenceField[];
  sampleDocs: Array<Record<string, unknown>>;
  recognizerModules: RecognizerModuleHit[];
}
