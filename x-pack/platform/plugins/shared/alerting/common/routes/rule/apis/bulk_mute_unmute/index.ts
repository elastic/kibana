/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkMuteUnmuteAlertsBodySchema } from './schemas/latest';
export type { BulkMuteUnmuteAlertsRequestBody } from './types/latest';

export { bulkMuteUnmuteAlertsBodySchema as bulkMuteUnmuteAlertsBodySchemaV1 } from './schemas/v1';
export type { BulkMuteUnmuteAlertsRequestBody as BulkMuteUnmuteAlertsRequestBodyV1 } from './types/v1';

export * from './transforms';
