/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These fields are unbounded (additionalProperties: true, no ingest-time size limit)
// and can hold ~100 KB+ of raw data per document. Exclude them from bulk fetches
// to avoid exceeding Kibana's 100 MB max response size.
export const UNBOUNDED_SCORE_FIELDS = [
  'task.output',
  'example.input',
  'example.metadata',
  'evaluator.metadata',
];
