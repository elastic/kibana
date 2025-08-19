/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ContainerModule } from 'inversify';
import { OnSetup, OnStart, PluginSetup, PluginStart, Setup, Start } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  type PluginConfigDescriptor,
  StartServicesAccessor,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ActionsConfig } from './config';
import { configSchema } from './config';
import type { ActionsClient as ActionsClientClass } from './actions_client';
import type { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';
import { Actions } from './module';
import { ActionsPluginsStart, PluginStartContract } from './plugin';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ServerlessPluginStart } from '@kbn/serverless/server';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';

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
  bind(Start).toResolvedValue((actions) => ({ actions }), [Actions]);
  bind(Setup).toResolvedValue((actions) => ({ actions }), [Actions]);

  bind(OnSetup).toConstantValue((container) => {
    const actions = container.get(Actions);
    const savedObjects = container.get(CoreSetup('savedObjects'));
    const analytics = container.get(CoreSetup('analytics'));
    const getStartServices = container.get<
      StartServicesAccessor<ActionsPluginsStart, PluginStartContract>
    >(CoreSetup('getStartServices'));
    const http = container.get(CoreSetup('http'));

    const licensing = container.get<LicensingPluginSetup>(PluginSetup('licensing'));
    const taskManager = container.get<TaskManagerSetupContract>(PluginSetup('taskManager'));
    const encryptedSavedObjects = container.get<EncryptedSavedObjectsPluginSetup>(
      PluginSetup('encryptedSavedObjects')
    );
    const eventLog = container.get<IEventLogService>(PluginSetup('eventLog'));
    const features = container.get<FeaturesPluginSetup>(PluginSetup('features'));
    const cloud = container.get<CloudSetup>(PluginSetup('cloud'));
    const security = container.get<SecurityPluginSetup>(PluginSetup('security'));
    const usageCollection = container.get<UsageCollectionSetup>(PluginSetup('usageCollection'));
    // TODO Uncomment
    // const serverless = await container.getAsync<ServerlessPluginSetup>(PluginSetup('serverless'));
    const monitoringCollection = container.get<MonitoringCollectionSetup>(
      PluginSetup('monitoringCollection')
    );

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
    });
  });

  bind(OnStart).toConstantValue(async (container) => {
    const actions = await container.getAsync(Actions);
    const http = await container.getAsync(CoreStart('http'));
    const savedObjects = await container.getAsync(CoreStart('savedObjects'));
    const elasticsearch = await container.getAsync(CoreStart('elasticsearch'));
    const featureFlags = await container.getAsync(CoreStart('featureFlags'));
    const analytics = await container.getAsync(CoreStart('analytics'));
    const security = await container.getAsync(CoreStart('security'));

    const encryptedSavedObjects = await container.getAsync<EncryptedSavedObjectsPluginStart>(
      PluginStart('encryptedSavedObjects')
    );
    const taskManager = await container.getAsync<TaskManagerStartContract>(
      PluginStart('taskManager')
    );
    const licensing = await container.getAsync<LicensingPluginStart>(PluginStart('licensing'));
    const eventLog = await container.getAsync<IEventLogClientService>(PluginStart('eventLog'));
    const spaces = await container.getAsync<SpacesPluginStart>(PluginStart('spaces'));
    const securityPlugin = await container.getAsync<SecurityPluginStart>(PluginStart('security'));
    const serverless = await container.getAsync<ServerlessPluginStart>(PluginStart('serverless'));

    return actions.start({
      core: { http, savedObjects, elasticsearch, featureFlags, analytics, security },
      plugins: {
        encryptedSavedObjects,
        taskManager,
        licensing,
        eventLog,
        spaces,
        security: securityPlugin,
        serverless,
      },
    });
  });
});
