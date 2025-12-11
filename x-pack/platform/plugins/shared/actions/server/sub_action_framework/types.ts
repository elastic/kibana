/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as z3 from '@kbn/zod';
import type * as z4 from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { LicenseType } from '@kbn/licensing-types';

import type { Method, AxiosRequestConfig } from 'axios';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SSLSettings } from '@kbn/actions-utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type {
  ActionTypeParams,
  RenderParameterTemplates,
  Services,
  ValidatorType as ValidationSchema,
} from '../types';
import type { SubFeature } from '../../common';
import type { SubActionConnector } from './sub_action_connector';
import type { HookServices } from '../types';
import type { ActionExecutionSourceType } from '../lib';

export interface ServiceParams<Config, Secrets> {
  /**
   * The type is the connector type id. For example ".servicenow"
   * The id is the connector's SavedObject UUID.
   */
  connector: { id: string; type: string };
  config: Config;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  secrets: Secrets;
  services: Services;
  request?: KibanaRequest;
}

export type SubActionRequestParams<R> = {
  url: string;
  responseSchema: z3.ZodType<R>;
  method?: Method;
  sslOverrides?: SSLSettings;
} & AxiosRequestConfig;

export type IService<Config, Secrets> = new (
  params: ServiceParams<Config, Secrets>
) => SubActionConnector<Config, Secrets>;

export type IServiceAbstract<Config, Secrets> = abstract new (
  params: ServiceParams<Config, Secrets>
) => SubActionConnector<Config, Secrets>;

export type ICaseServiceAbstract<Config, Secrets, Incident, GetIncidentResponse> = abstract new (
  params: ServiceParams<Config, Secrets>,
  pushToServiceIncidentParamsSchema: Record<string, z3.ZodType<unknown>>
) => SubActionConnector<Config, Secrets>;

export enum ValidatorType {
  CONFIG,
  SECRETS,
}

interface Validate<T> {
  validator: ValidateFn<T>;
}

export type ValidateFn<T> = NonNullable<ValidationSchema<T>['customValidator']>;

interface ConfigValidator<T> extends Validate<T> {
  type: ValidatorType.CONFIG;
}

interface SecretsValidator<T> extends Validate<T> {
  type: ValidatorType.SECRETS;
}

export type Validators<Config, Secrets> = Array<
  ConfigValidator<Config> | SecretsValidator<Secrets>
>;

export interface PreSaveConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
}

export interface PostSaveConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
  wasSuccessful: boolean;
}

export interface PostDeleteConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  logger: Logger;
  services: HookServices;
  request: KibanaRequest;
}

export interface SubActionConnectorType<Config, Secrets> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  supportedFeatureIds: string[];
  schema: {
    config: z3.ZodType<Config> | z4.ZodType;
    secrets: z3.ZodType<Secrets, z3.ZodTypeDef, Secrets | undefined> | z4.ZodType;
  };
  validators?: Array<ConfigValidator<Config> | SecretsValidator<Secrets>>;
  getService: (params: ServiceParams<Config, Secrets>) => SubActionConnector<Config, Secrets>;
  renderParameterTemplates?: RenderParameterTemplates<ExecutorParams>;
  isSystemActionType?: boolean;
  subFeature?: SubFeature;
  getKibanaPrivileges?: (args?: {
    params?: { subAction: string; subActionParams: Record<string, unknown> };
    source?: ActionExecutionSourceType;
  }) => string[];
  preSaveHook?: (params: PreSaveConnectorHookParams<Config, Secrets>) => Promise<void>;
  postSaveHook?: (params: PostSaveConnectorHookParams<Config, Secrets>) => Promise<void>;
  postDeleteHook?: (params: PostDeleteConnectorHookParams<Config, Secrets>) => Promise<void>;
}

export interface ExecutorParams extends ActionTypeParams {
  subAction: string;
  subActionParams: Record<string, unknown>;
}

export type ExtractFunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends Function ? P : never;
}[keyof T];

export interface SubAction {
  name: string;
  method: string;
  schema: z3.ZodType<unknown> | null;
}

export interface PushToServiceParams {
  incident: {
    externalId: string | null;
    [x: string]: unknown;
  };
  comments: Array<{ commentId: string; comment: string }>;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}
