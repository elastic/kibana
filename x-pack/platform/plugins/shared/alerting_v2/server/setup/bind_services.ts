/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreStart, Request, SavedObjectsClientFactory } from '@kbn/core-di-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { DirectorService } from '../lib/director/director';
import { BasicTransitionStrategy } from '../lib/director/strategies/basic_strategy';
import { CountTimeframeStrategy } from '../lib/director/strategies/count_timeframe_strategy';
import { TransitionStrategyFactory } from '../lib/director/strategies/strategy_resolver';
import { TransitionStrategyToken } from '../lib/director/strategies/types';
import { DispatcherService } from '../lib/dispatcher/dispatcher';
import {
  DispatcherEnabledProviderToken,
  DispatcherServiceInternalToken,
} from '../lib/dispatcher/tokens';
import { ALERTING_V2_DISPATCHER_ENABLED_SETTING_ID } from '../../common/advanced_settings';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { ActionPolicyNamespaceToken } from '../lib/action_policy_client/tokens';
import { RulesClient } from '../lib/rules_client';
import { RulesClientSpaceIdToken } from '../lib/rules_client/tokens';
import { ApiKeyService } from '../lib/services/api_key_service/api_key_service';
import { EsServiceInternalToken, EsServiceScopedToken } from '../lib/services/es_service/tokens';
import { EventLogService } from '../lib/services/event_log_service/event_log_service';
import { EventLogServiceToken } from '../lib/services/event_log_service/tokens';
import { LoggerService, LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { ActionPolicySavedObjectService } from '../lib/services/action_policy_saved_object_service/action_policy_saved_object_service';
import {
  ActionPolicySavedObjectsClientToken,
  ActionPolicySavedObjectServiceInternalToken,
  ActionPolicySavedObjectServiceScopedToken,
} from '../lib/services/action_policy_saved_object_service/tokens';
import { QueryService } from '../lib/services/query_service/query_service';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
} from '../lib/services/query_service/tokens';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { AlertingRetryService } from '../lib/services/retry_service';
import { RetryServiceToken } from '../lib/services/retry_service/tokens';
import { RulesSavedObjectService } from '../lib/services/rules_saved_object_service/rules_saved_object_service';
import {
  RuleSavedObjectsClientToken,
  RulesSavedObjectServiceInternalToken,
  RulesSavedObjectServiceScopedToken,
} from '../lib/services/rules_saved_object_service/tokens';
import { StorageService } from '../lib/services/storage_service/storage_service';
import {
  StorageServiceInternalToken,
  StorageServiceScopedToken,
} from '../lib/services/storage_service/tokens';
import {
  createTaskRunnerFactory,
  TaskRunnerFactoryToken,
} from '../lib/services/task_run_scope_service/create_task_runner';
import { UserService } from '../lib/services/user_service/user_service';
import { WorkflowExtensionsService } from '../lib/services/workflow_extensions_service/workflow_extensions_service';
import {
  WorkflowExtensionsServiceToken,
  WorkflowsClientToken,
} from '../lib/services/workflow_extensions_service/tokens';
import { ApiKeyServiceSavedObjectsClientToken } from '../lib/services/api_key_service/tokens';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import {
  EncryptedSavedObjectsClientToken,
  WorkflowsManagementApiToken,
} from '../lib/dispatcher/steps/dispatch_step_tokens';
import { MatcherSuggestionsService } from '../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { RuleDoctorInsightsClient } from '../lib/rule_doctor_insights_client/rule_doctor_insights_client';
import { SpaceContext } from '../routes/rule_doctor_insights/space_context';
import {
  InsightsClientScopedToken,
  InsightsClientInternalToken,
} from '../lib/rule_doctor_insights_client/tokens';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(AlertActionsClient).toSelf().inRequestScope();
  bind(RulesClient)
    .toDynamicValue(({ get }) => {
      return new RulesClient({
        services: {
          request: get(Request),
          rulesSavedObjectService: get(RulesSavedObjectServiceScopedToken),
          taskManager: get(PluginStart<TaskManagerStartContract>('taskManager')),
          userService: get(UserService),
        },
        options: {
          spaceId: get(RulesClientSpaceIdToken),
        },
      });
    })
    .inRequestScope();
  bind(RulesClientSpaceIdToken)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      return spaces.spacesService.getSpaceId(request);
    })
    .inRequestScope();
  bind(ActionPolicyNamespaceToken)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      const spaceId = spaces.spacesService.getSpaceId(request);
      return spaces.spacesService.spaceIdToNamespace(spaceId);
    })
    .inRequestScope();
  bind(ActionPolicyClient)
    .toDynamicValue(({ get }) => {
      return new ActionPolicyClient(
        get(ActionPolicySavedObjectServiceScopedToken),
        get(UserService),
        get(ApiKeyService),
        get(EncryptedSavedObjectsClientToken),
        get(ActionPolicyNamespaceToken)
      );
    })
    .inRequestScope();
  bind(UserService).toSelf().inRequestScope();
  bind(ApiKeyService).toSelf().inRequestScope();
  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(RetryServiceToken).toService(AlertingRetryService);

  bind(LoggerService).toSelf().inSingletonScope();
  bind(LoggerServiceToken).toService(LoggerService);
  bind(EventLogService).toSelf().inSingletonScope();
  bind(EventLogServiceToken).toService(EventLogService);
  bind(WorkflowsClientToken)
    .toResolvedValue(
      async (workflowsExtensionsStart, request) => workflowsExtensionsStart.getClient(request),
      [
        PluginStart<AlertingServerStartDependencies['workflowsExtensions']>('workflowsExtensions'),
        Request,
      ]
    )
    .inRequestScope();
  bind(WorkflowExtensionsService).toSelf().inRequestScope();
  bind(WorkflowExtensionsServiceToken).toService(WorkflowExtensionsService);
  bind(ResourceManager).toSelf().inSingletonScope();

  bind(EsServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const elasticsearch = get(CoreStart('elasticsearch'));
      return elasticsearch.client.asInternalUser;
    })
    .inSingletonScope();

  bind(EsServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const elasticsearch = get(CoreStart('elasticsearch'));
      return elasticsearch.client.asScoped(request).asCurrentUser;
    })
    .inRequestScope();

  bind(TaskRunnerFactoryToken).toFactory((context) =>
    createTaskRunnerFactory({
      getInjection: () => context.get(CoreStart('injection')),
    })
  );

  bind(RuleSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({ includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE] }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  bind(RulesSavedObjectService).toSelf().inRequestScope();
  bind(RulesSavedObjectServiceScopedToken).toService(RulesSavedObjectService);
  bind(RulesSavedObjectServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      const internalClient = savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE]);
      return new RulesSavedObjectService(internalClient, spaces);
    })
    .inSingletonScope();

  bind(EncryptedSavedObjectsClientToken)
    .toDynamicValue(({ get }) => {
      const eso = get(
        PluginStart<AlertingServerStartDependencies['encryptedSavedObjects']>(
          'encryptedSavedObjects'
        )
      );
      return eso.getClient({ includedHiddenTypes: [ACTION_POLICY_SAVED_OBJECT_TYPE] });
    })
    .inSingletonScope();

  bind(ActionPolicySavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({
          includedHiddenTypes: [ACTION_POLICY_SAVED_OBJECT_TYPE],
        }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  bind(ActionPolicySavedObjectService).toSelf().inRequestScope();
  bind(ActionPolicySavedObjectServiceScopedToken).toService(ActionPolicySavedObjectService);
  bind(ActionPolicySavedObjectServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      const internalClient = savedObjects.createInternalRepository([
        ACTION_POLICY_SAVED_OBJECT_TYPE,
      ]);
      const esoClient = get(EncryptedSavedObjectsClientToken);
      return new ActionPolicySavedObjectService(internalClient, spaces, esoClient);
    })
    .inSingletonScope();

  bind(ApiKeyServiceSavedObjectsClientToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      return savedObjects.createInternalRepository([API_KEY_PENDING_INVALIDATION_TYPE]);
    })
    .inSingletonScope();

  bind(QueryServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceScopedToken);
      return new QueryService(esClient, loggerService);
    })
    .inRequestScope();

  bind(QueryServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceInternalToken);
      return new QueryService(esClient, loggerService);
    })
    .inSingletonScope();

  bind(StorageServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceScopedToken);
      return new StorageService(esClient, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceInternalToken);
      return new StorageService(esClient, loggerService);
    })
    .inSingletonScope();

  bind(WorkflowsManagementApiToken)
    .toDynamicValue(({ get }) => {
      const wfm = get(
        PluginSetup<AlertingServerSetupDependencies['workflowsManagement']>('workflowsManagement')
      );
      return wfm.management;
    })
    .inSingletonScope();

  bind(MatcherSuggestionsService).toSelf().inRequestScope();

  bind(DispatcherService).toSelf().inSingletonScope();
  bind(DispatcherServiceInternalToken).toService(DispatcherService);

  bind(DispatcherEnabledProviderToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      const uiSettings = get(CoreStart('uiSettings'));
      return async () => {
        const soClient = savedObjects.createInternalRepository();
        const client = uiSettings.globalAsScopedToClient(soClient);
        return client.get<boolean>(ALERTING_V2_DISPATCHER_ENABLED_SETTING_ID);
      };
    })
    .inSingletonScope();

  bind(SpaceContext).toSelf().inRequestScope();

  bind(InsightsClientScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceScopedToken);
      return new RuleDoctorInsightsClient(esClient, loggerService);
    })
    .inRequestScope();

  bind(InsightsClientInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerServiceToken);
      const esClient = get(EsServiceInternalToken);
      return new RuleDoctorInsightsClient(esClient, loggerService);
    })
    .inSingletonScope();

  bind(DirectorService).toSelf().inSingletonScope();
  bind(TransitionStrategyFactory).toSelf().inSingletonScope();

  bind(TransitionStrategyToken).to(CountTimeframeStrategy).inSingletonScope();
  bind(TransitionStrategyToken).to(BasicTransitionStrategy).inSingletonScope();
}
