/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Container, ContainerModule, ServiceIdentifier } from 'inversify';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { CoreSetup, CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { Logger, type PluginConfigDescriptor } from '@kbn/core/server';
import type { ActionsConfig } from './config';
import { configSchema, getValidatedConfig } from './config';
import type { ActionsClient as ActionsClientClass } from './actions_client';
import type { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';
import { Actions } from './module';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { InMemoryMetrics } from './monitoring';
import { PluginSetup, PluginStart, Setup, Start } from '@kbn/core/packages/di/common';
import { LicenseState } from './lib';
import { satisfies } from 'semver';
import { ActionsPluginsSetup } from './plugin';
import { ActionsPluginSetupDeps, ActionsPluginStartDeps } from './types';

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
  bind(Actions).toSelf().inSingletonScope();

  bind(Setup).toDynamicValue(({ get }) => {
    const actions = get(Actions);
    const savedObjects = get(CoreSetup('savedObjects'));
    const analytics = get(CoreSetup('analytics'));
    const getStartServices = get(CoreSetup('getStartServices'));
    const http = get(CoreSetup('http'));
    const licensing = get(PluginSetup('licensing'));
    const taskManager = get(PluginSetup('taskManager'));
    const encryptedSavedObjects = get(PluginSetup('encryptedSavedObjects'));
    const eventLog = get(PluginSetup('eventLog'));
    const features = get(PluginSetup('features'));
    const cloud = get(PluginSetup('cloud'));
    const security = get(PluginSetup('security'));
    const usageCollection = get(PluginSetup('usageCollection'));
    // const serverless = get(PluginSetup('serverless'));
    const monitoringCollection = get(PluginSetup('monitoringCollection'));

    return actions.setup({
      core: { savedObjects, analytics, getStartServices, http },
      plugins: {
        licensing,
        taskManager,
        encryptedSavedObjects,
        eventLog,
        features,
        cloud,
        security,
        usageCollection,
        // serverless,
        monitoringCollection,
      },
    } as ActionsPluginSetupDeps);
  });

  bind(Start).toDynamicValue(({ get }) => {
    const actions = get(Actions);
    const http = get(CoreStart('http'));
    const savedObjects = get(CoreStart('savedObjects'));
    const elasticsearch = get(CoreStart('elasticsearch'));
    const featureFlags = get(CoreStart('featureFlags'));
    const analytics = get(CoreStart('analytics'));
    const security = get(CoreStart('security'));
    const encryptedSavedObjects = get(PluginStart('encryptedSavedObjects'));
    const taskManager = get(PluginStart('taskManager'));
    const licensing = get(PluginStart('licensing'));
    const eventLog = get(PluginStart('eventLog'));
    const spaces = get(PluginStart('spaces'));
    const securityPlugin = get(PluginStart('security'));
    // const serverless = get(PluginStart('serverless'));

    return actions.start({
      core: { http, savedObjects, elasticsearch, featureFlags, analytics, security },
      plugins: {
        encryptedSavedObjects,
        taskManager,
        licensing,
        eventLog,
        spaces,
        security: securityPlugin,
        // serverless,
      },
    } as ActionsPluginStartDeps);
  });
});
