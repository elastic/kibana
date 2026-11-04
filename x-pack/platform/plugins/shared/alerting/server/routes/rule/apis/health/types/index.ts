/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TermsBucket {
  key: string;
  doc_count: number;
}

export interface RuleHealthAggregationResult {
  status: { buckets: TermsBucket[] };
  outcome: { buckets: TermsBucket[] };
  error_reason: {
    buckets: Array<TermsBucket & { message: { buckets: TermsBucket[] } }>;
  };
  warning_reason: { buckets: TermsBucket[] };
  api_key_error?: {
    buckets: Array<TermsBucket & { reason?: { buckets: TermsBucket[] } }>;
  };
  missing_api_key: { doc_count: number };
  legacy_missing_api_key: { doc_count: number };
}
