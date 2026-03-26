/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KueryNode } from '@kbn/es-query';
import type { RuleParams } from '../../../types';
import type { ParamsModifier, ShouldIncrementRevision } from '../../../../../rules_client/common';
import type {
  bulkEditParamsOperationsSchema,
  bulkEditParamsOperationSchema,
  bulkEditRuleParamsOperationSchema,
} from '../schemas';

export type BulkEditParamsOperation = TypeOf<typeof bulkEditParamsOperationSchema>;
export type BulkEditParamsOperations = TypeOf<typeof bulkEditParamsOperationsSchema>;

export type BulkEditRuleParamsOperation = TypeOf<typeof bulkEditRuleParamsOperationSchema>;

export interface BulkEditRuleParamsOptions<Params extends RuleParams> {
  ids?: string[];
  filter?: string | KueryNode;
  operations: BulkEditParamsOperation[];
  paramsModifier?: ParamsModifier<Params>;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}
