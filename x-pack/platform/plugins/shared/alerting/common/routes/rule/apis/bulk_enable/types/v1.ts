/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';
import { bulkEnableBodySchemaV1 } from '..';

export type BulkEnableRulesRequestBody = TypeOf<typeof bulkEnableBodySchemaV1>;

interface BulkEnableOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

export interface BulkEnableRulesResponse<Params extends RuleParamsV1 = never> {
  body: {
    rules: Array<RuleResponseV1<Params>>;
    errors: BulkEnableOperationError[];
    total: number;
    task_ids_failed_to_be_enabled: string[];
  };
}
