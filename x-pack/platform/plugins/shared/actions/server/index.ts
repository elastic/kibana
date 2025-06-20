/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import type { ActionsConfig } from './config';
import { configSchema } from './config';
import type { ActionsClient as ActionsClientClass } from './actions_client';
import type { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';

export type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
export { UnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
export type ActionsClient = PublicMethodsOf<ActionsClientClass>;
export type ActionsAuthorization = PublicMethodsOf<ActionsAuthorizationClass>;

export type {
  ActionsPlugin,
  ActionResult,
  ActionTypeExecutorOptions,
  ActionType,
  InMemoryConnector,
  ActionsApiRequestHandlerContext,
  SSLSettings,
} from './types';

export type { ConnectorWithExtraFindData as FindActionResult } from './application/connector/types';

export type { PluginSetupContract, PluginStartContract } from './plugin';

export {
  asSavedObjectExecutionSource,
  asHttpRequestExecutionSource,
  asNotificationExecutionSource,
  getBasicAuthHeader,
} from './lib';
export { ACTION_SAVED_OBJECT_TYPE } from './constants/saved_objects';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { ActionsPlugin } = await import('./plugin');
  return new ActionsPlugin(initContext);
};

export { SubActionConnector } from './sub_action_framework/sub_action_connector';
export { CaseConnector } from './sub_action_framework/case';
export type { ServiceParams } from './sub_action_framework/types';

export const config: PluginConfigDescriptor<ActionsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    email: { domain_allowlist: true, services: { enabled: true } },
    webhook: { ssl: { pfx: { enabled: true } } },
  },
};

export { urlAllowListValidator } from './sub_action_framework/helpers';
export { ActionExecutionSourceType } from './lib/action_execution_source';
