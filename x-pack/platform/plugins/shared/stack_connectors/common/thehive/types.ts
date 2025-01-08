/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  TheHiveConfigSchema,
  TheHiveSecretsSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionCreateAlertParamsSchema,
  TheHiveFailureResponseSchema,
  TheHiveIncidentResponseSchema,
} from './schema';

export type TheHiveConfig = TypeOf<typeof TheHiveConfigSchema>;
export type TheHiveSecrets = TypeOf<typeof TheHiveSecretsSchema>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;
export type ExecutorSubActionCreateAlertParams = TypeOf<
  typeof ExecutorSubActionCreateAlertParamsSchema
>;

export type TheHiveFailureResponse = TypeOf<typeof TheHiveFailureResponseSchema>;

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export type GetIncidentResponse = TypeOf<typeof TheHiveIncidentResponseSchema>;
