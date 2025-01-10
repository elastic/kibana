/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkEditOperationsSchema, bulkEditRulesRequestBodySchema } from './schemas/latest';
export type { BulkEditRulesRequestBody, BulkEditRulesResponse } from './types/latest';

export {
  bulkEditOperationsSchema as bulkEditOperationsSchemaV1,
  bulkEditRulesRequestBodySchema as bulkEditRulesRequestBodySchemaV1,
} from './schemas/v1';
export type {
  BulkEditRulesRequestBody as BulkEditRulesRequestBodyV1,
  BulkEditRulesResponse as BulkEditRulesResponseV1,
} from './types/v1';
