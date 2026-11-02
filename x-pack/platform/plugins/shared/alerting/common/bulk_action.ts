/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from './rule';

export type BulkEditSkipReason = 'RULE_NOT_MODIFIED';
export type BulkGapsFillingSkipReason = 'NO_GAPS_TO_FILL';
export type BulkDeleteSkipReason = 'RULE_NOT_FOUND';

type AllowedSkipReason = BulkEditSkipReason | BulkGapsFillingSkipReason | BulkDeleteSkipReason;

interface SkipResult<SkipReason extends AllowedSkipReason> {
  id: Rule['id'];
  name?: Rule['name'];
  skip_reason: SkipReason;
}

export type BulkEditActionSkipResult = SkipResult<BulkEditSkipReason>;

export type BulkGapsFillingSkipResult = SkipResult<BulkGapsFillingSkipReason>;

export type BulkDeleteActionSkipResult = SkipResult<BulkDeleteSkipReason>;

export type BulkActionSkipResult =
  | BulkEditActionSkipResult
  | BulkGapsFillingSkipResult
  | BulkDeleteActionSkipResult;
