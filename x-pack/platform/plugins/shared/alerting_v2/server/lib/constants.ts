/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_ID = 'alerting_v2';

/**
 * Upper bound on the number of distinct tags a terms aggregation returns.
 * Shared by the rules and rule-template tag APIs so both filter UIs behave the
 * same.
 */
export const TAGS_AGG_SIZE = 10000;

/** Shape of the `tags` terms aggregation used by the tag-list APIs. */
export interface TagsAggregationResult {
  tags: { buckets: Array<{ key: string }> };
}
