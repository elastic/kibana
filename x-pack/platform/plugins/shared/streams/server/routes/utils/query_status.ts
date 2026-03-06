/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueryStatus } from '../../../common/queries';
import type { RuleUnbackedFilter } from '../../lib/streams/assets/query/query_client';

export const queryStatusSchema = z
  .preprocess(
    (val) => (typeof val === 'string' ? [val] : val),
    z.array(z.enum(['active', 'draft']))
  )
  .optional()
  .describe('Filter queries by status: active (promoted) or draft (unbacked)');

export function toRuleUnbackedFilter(statuses: QueryStatus[]): RuleUnbackedFilter {
  const hasActive = statuses.includes('active');
  const hasDraft = statuses.includes('draft');

  if (hasActive && hasDraft) {
    return 'include';
  }
  if (hasDraft) {
    return 'only';
  }
  return 'exclude';
}
