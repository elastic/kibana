/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ContainerModule } from 'inversify';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginInitializer } from '@kbn/core-di-server';
import { type PluginConfigDescriptor } from '@kbn/core/server';
import { Setup, Start } from '@kbn/core-di';
import type { ActionsConfig } from './config';
import { configSchema, getValidatedConfig } from './config';
import type { ActionsClient as ActionsClientClass } from './actions_client';
import type { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';
import {
  ACTIONS_CONFIG,
  IN_MEMORY_CONNECTORS_SERVICE,
  IN_MEMORY_METRICS_SERVICE,
  LOGGER,
  TELEMETRY_LOGGER,
} from './constants';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { InMemoryMetrics } from './monitoring';
import { ModuleSetup } from './module_setup';
import { ModuleStart } from './module_start';

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

// export const plugin = async (initContext: PluginInitializerContext) => {
//   const { ActionsPlugin } = await import('./plugin');
//   return new ActionsPlugin(initContext);
// };

export { SubActionConnector } from './sub_action_framework/sub_action_connector';
export { CaseConnector } from './sub_action_framework/case';
export type { ServiceParams } from './sub_action_framework/types';

export const config: PluginConfigDescriptor<ActionsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    // recipient_allowlist is not exposed because it may contain sensitive information
    email: { domain_allowlist: true, recipient_allowlist: false, services: { enabled: true } },
    webhook: { ssl: { pfx: { enabled: true } } },
  },
};

export { urlAllowListValidator } from './sub_action_framework/helpers';
export { ActionExecutionSourceType } from './lib/action_execution_source';

export const module = new ContainerModule(({ bind }) => {
  bind(LOGGER).toDynamicValue(({ get }) => {
    const loggerFactory = get(PluginInitializer('logger'));
    return loggerFactory.get();
  });
  bind(TELEMETRY_LOGGER).toDynamicValue(({ get }) => {
    const loggerFactory = get(PluginInitializer('logger'));
    return loggerFactory.get('usage');
  });
  bind(ACTIONS_CONFIG).toDynamicValue(({ get }) => {
    const logger = get(LOGGER);
    const configService = get(PluginInitializer('config'));
    return getValidatedConfig(
      logger,
      resolveCustomHosts(logger, configService.get<ActionsConfig>())
    );
  });
  bind(IN_MEMORY_CONNECTORS_SERVICE).toConstantValue([]);
  bind(IN_MEMORY_METRICS_SERVICE).toDynamicValue(({ get }) => {
    const loggerFactory = get(PluginInitializer('logger'));
    return new InMemoryMetrics(loggerFactory.get('in_memory_metrics'));
  });

  bind(Setup).to(ModuleSetup).inSingletonScope();
  bind(Start).to(ModuleStart).inSingletonScope();
});
