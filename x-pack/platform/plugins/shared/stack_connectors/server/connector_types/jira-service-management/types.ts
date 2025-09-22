/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type {
  CreateAlertParamsSchema,
  ConfigSchema,
  SecretsSchema,
  FailureResponse,
  CloseAlertParamsSchema,
} from './schema';
import type { JiraServiceManagementSubActions } from '../../../common/jira-service-management/constants';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;

export type CreateAlertParams = TypeOf<typeof CreateAlertParamsSchema>;
export type CloseAlertParams = TypeOf<typeof CloseAlertParamsSchema>;

export interface CreateAlertSubActionParams {
  subAction: JiraServiceManagementSubActions.CreateAlert;
  subActionParams: CreateAlertParams;
}

export interface CloseAlertSubActionParams {
  subAction: JiraServiceManagementSubActions.CloseAlert;
  subActionParams: CloseAlertParams;
}

export type Params = CreateAlertSubActionParams | CloseAlertSubActionParams;

export type FailureResponseType = TypeOf<typeof FailureResponse>;
