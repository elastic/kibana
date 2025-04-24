/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { alertDeletePreviewQuerySchema } from './preview/schemas/latest';
export { alertDeletePreviewQuerySchema as alertDeletePreviewQuerySchemaV1 } from './preview/schemas/v1';

export { alertDeletePreviewResponseSchema } from './preview/schemas/latest';
export { alertDeletePreviewResponseSchema as alertDeletePreviewResponseSchemaV1 } from './preview/schemas/v1';

export type { AlertDeletePreviewQuery } from './preview/types/latest';
export type { AlertDeletePreviewQuery as AlertDeletePreviewQueryV1 } from './preview/types/v1';

export type { AlertDeletePreviewResponse } from './preview/types/latest';
export type { AlertDeletePreviewResponse as AlertDeletePreviewResponseV1 } from './preview/types/v1';
