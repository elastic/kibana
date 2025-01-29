/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { bulkDeleteRulesRequestBodySchemaV1 } from '..';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';

export interface BulkOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

export type BulkDeleteRulesRequestBody = TypeOf<typeof bulkDeleteRulesRequestBodySchemaV1>;

export interface BulkDeleteRulesResponse<Params extends RuleParamsV1 = never> {
  body: {
    rules: Array<RuleResponseV1<Params>>;
    errors: BulkOperationError[];
    total: number;
    taskIdsFailedToBeDeleted: string[];
  };
}
