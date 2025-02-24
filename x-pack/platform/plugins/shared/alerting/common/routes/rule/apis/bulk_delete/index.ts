/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkDeleteRulesRequestBodySchema } from './schemas/latest';
export { bulkDeleteRulesRequestBodySchema as bulkDeleteRulesRequestBodySchemaV1 } from './schemas/v1';

export type {
  BulkDeleteRulesResponse,
  BulkOperationError,
  BulkDeleteRulesRequestBody,
} from './types/latest';
export type {
  BulkDeleteRulesResponse as BulkDeleteRulesResponseV1,
  BulkOperationError as BulkOperationErrorV1,
  BulkDeleteRulesRequestBody as BulkDeleteRulesRequestBodyV1,
} from './types/v1';

export { validateBulkDeleteRulesBody } from './validation/latest';
export { validateBulkDeleteRulesBody as validateBulkDeleteRulesBodyV1 } from './validation/v1';
