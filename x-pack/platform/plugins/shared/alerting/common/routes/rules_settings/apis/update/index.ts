/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  updateQueryDelaySettingsBodySchema,
  updateAlertDeletionSettingsBodySchema,
} from './schemas/latest';
export type {
  UpdateQueryDelaySettingsRequestBody,
  UpdateQueryDelaySettingsResponse,
  UpdateAlertDeletionSettingsRequestBody,
  UpdateAlertDeletionSettingsResponse,
} from './types/latest';

export {
  updateQueryDelaySettingsBodySchema as updateQueryDelaySettingsBodySchemaV1,
  updateAlertDeletionSettingsBodySchema as updateAlertDeletionSettingsBodySchemaV1,
} from './schemas/v1';
export type {
  UpdateQueryDelaySettingsRequestBody as UpdateQueryDelaySettingsRequestBodyV1,
  UpdateQueryDelaySettingsResponse as UpdateQueryDelaySettingsResponseV1,
  UpdateAlertDeletionSettingsRequestBody as UpdateAlertDeletionSettingsRequestBodyV1,
  UpdateAlertDeletionSettingsResponse as UpdateAlertDeletionSettingsResponseV1,
} from './types/v1';
