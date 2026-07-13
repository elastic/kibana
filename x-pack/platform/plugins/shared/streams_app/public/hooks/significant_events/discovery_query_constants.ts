/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryStatus } from '@kbn/significant-events-plugin/common';

/** Page size used when only the total query count is needed. */
export const DISCOVERY_QUERY_COUNT_PER_PAGE = 1;

export const ACTIVE_DRAFT_QUERY_STATUS = [
  'active',
  'draft',
] as const satisfies readonly QueryStatus[];
