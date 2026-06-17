/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

/**
 * Bulk endpoints only emit `truncated` / `totalMatched` when a `filter`
 * matches more than `BULK_FILTER_MAX_RULES` (see `@kbn/alerting-v2-schemas`).
 * For small fixtures we want to assert those metadata fields are *absent* —
 * otherwise the server has accidentally started reporting them for every
 * request, which is a regression worth catching.
 */
export const expectNoBulkTruncationMetadata = (body: Record<string, unknown>): void => {
  expect(Object.keys(body)).not.toContain('truncated');
  expect(Object.keys(body)).not.toContain('totalMatched');
};
