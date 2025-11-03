/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';
import type {
  CreateAlertParamsSchema,
  CloseAlertParamsSchema,
  ConfigSchema,
  SecretsSchema,
  FailureResponse,
} from './schema';
import type { OpsgenieSubActions } from '../../../common';

export type Config = z.infer<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;

export type CreateAlertParams = z.infer<typeof CreateAlertParamsSchema>;
export type CloseAlertParams = z.infer<typeof CloseAlertParamsSchema>;

export interface CreateAlertSubActionParams {
  subAction: OpsgenieSubActions.CreateAlert;
  subActionParams: CreateAlertParams;
}

export interface CloseAlertSubActionParams {
  subAction: OpsgenieSubActions.CloseAlert;
  subActionParams: CloseAlertParams;
}

export type Params = CreateAlertSubActionParams | CloseAlertSubActionParams;

export type FailureResponseType = z.infer<typeof FailureResponse>;
