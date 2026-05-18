/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { deleteRuleRequestParamsSchema, deleteRuleRequestQuerySchema } from './schemas/latest';
export type { DeleteRuleRequestParams, DeleteRuleRequestQuery } from './types/latest';

export {
  deleteRuleRequestParamsSchema as deleteRuleRequestParamsSchemaV1,
  deleteRuleRequestQuerySchema as deleteRuleRequestQuerySchemaV1,
} from './schemas/v1';
export type {
  DeleteRuleRequestParams as DeleteRuleRequestParamsV1,
  DeleteRuleRequestQuery as DeleteRuleRequestQueryV1,
} from './types/v1';
