/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  alertDeletionPreviewQuerySchema,
  alertDeletionPreviewResponseSchema,
} from './schemas/latest';
export type { AlertDeletionPreviewQuery, AlertDeletionPreviewResponse } from './types/latest';

export {
  alertDeletionPreviewQuerySchema as alertDeletionPreviewQuerySchemaV1,
  alertDeletionPreviewResponseSchema as alertDeletionPreviewResponseSchemaV1,
} from './schemas/v1';
export type {
  AlertDeletionPreviewQuery as AlertDeletionPreviewQueryV1,
  AlertDeletionPreviewResponse as AlertDeletionPreviewResponseV1,
} from './types/v1';
