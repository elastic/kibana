/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScheduleBackfillError } from '../../application/backfill/methods/schedule/types';

export function createBackfillError(
  message: string,
  ruleId: string,
  ruleName?: string
): ScheduleBackfillError {
  return { error: { message, rule: { id: ruleId, ...(ruleName ? { name: ruleName } : {}) } } };
}
