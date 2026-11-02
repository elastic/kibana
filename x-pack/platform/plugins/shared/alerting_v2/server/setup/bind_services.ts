/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { OnStart, Logger, PluginSetup, PluginStart } from '@kbn/core-di';
import {
  CoreStart,
  PluginInitializer,
  Request,
  SavedObjectsClientFactory,
} from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { AlertEventsClient } from '../lib/alert_events_client';
import { EpisodesClient } from '../lib/episodes_client';
import { DirectorService } from '../lib/director/director';
import { BasicTransitionStrategy } from '../lib/director/strategies/basic_strategy';
import { CountTimeframeStrategy } from '../lib/director/strategies/count_timeframe_strategy';
import { TransitionStrategyFactory } from '../lib/director/strategies/strategy_resolver';
import { TransitionStrategyToken } from '../lib/director/strategies/types';
import { getKibanaBaseUrl } from '../lib/dispatcher/kibana_base_url';
import { DispatcherService } from '../lib/dispatcher/dispatcher';
import { DispatcherServiceInternalToken, KibanaBaseUrlToken } from '../lib/dispatcher/tokens';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { ActionPolicyNamespaceToken } from '../lib/action_policy_client/tokens';
import { ActionPolicyExecutionHistoryClient } from '../lib/action_policy_execution_history_client';
import {
  ExecutionHistoryClient,
  ExecutionHistoryClientToken,
} from '../lib/execution_history_client';
import { EventOriginActorToken } from '../lib/event_origin/token';
import { RulesClientOptionsToken } from '../lib/rules_client/tokens';
import { InternalRulesClient, InternalRulesClientProvider } from '../lib/internal_rules_client';
import { RulesClient } from '../lib/rules_client';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import {
  RuleTemplatesClient,
  RuleTemplateSavedObjectsClientToken,
} from '../lib/rule_templates_client';
import {
  createChangeHistoryClient,
  ChangeHistoryClientToken,
  RuleChangesHistoryClient,
  RuleChangesHistoryClientToken,
  RuleChangesHistoryService,
  RuleChangesHistoryServiceToken,
} from '../lib/rule_changes_history';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import { ApiKeyService } from '../lib/services/api_key_service/api_key_service';
import {
  EsServiceInternalToken,
  EsServiceScopedToken,
  EsServiceScopedSpaceRoutingToken,
} from '../lib/services/es_service/tokens';
import { EventLogService } from '../lib/services/event_log_service/event_log_service';
import { EventLogServiceToken } from '../lib/services/event_log_service/tokens';
import { LoggerService, LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { SettingsService } from '../lib/services/settings_service/settings_service';
import {
  SettingsServiceToken,
  UiSettingsClientToken,
} from '../lib/services/settings_service/tokens';
import { MaintenanceWindowService } from '../lib/services/maintenance_window_service/maintenance_window_service';
import {
  MaintenanceWindowSavedObjectsClientToken,
  MaintenanceWindowServiceInternalToken,
} from '../lib/services/maintenance_window_service/tokens';
import { ActionPolicySavedObjectService } from '../lib/services/action_policy_saved_object_service/action_policy_saved_object_service';
import {
  ActionPolicySavedObjectsClientToken,
  ActionPolicySavedObjectServiceInternalToken,
  ActionPolicySavedObjectServiceScopedToken,
} from '../lib/services/action_policy_saved_object_service/tokens';
import { EsqlResponseFormatService } from '../lib/services/esql_response_format_service/esql_response_format_service';
import { EsqlResponseFormatServiceToken } from '../lib/services/esql_response_format_service/tokens';
import { QueryService } from '../lib/services/query_service/query_service';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
  QueryServiceScopedSpaceRoutingToken,
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
import { WorkflowService } from '../lib/services/workflow_service/workflow_service';
import { WorkflowServiceToken } from '../lib/services/workflow_service/tokens';
import { LicenseService } from '../lib/services/license_service/license_service';
import { LicenseServiceToken } from '../lib/services/license_service/tokens';
import { EbtService } from '../lib/services/ebt_service/ebt_service';
import { EbtServiceToken } from '../lib/services/ebt_service/tokens';
import { ApiKeyServiceSavedObjectsClientToken } from '../lib/services/api_key_service/tokens';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/saved_object_types';
import {
  EncryptedSavedObjectsClientToken,
  WorkflowsManagementApiToken,
} from '../lib/dispatcher/steps/dispatch_step_tokens';
import { MatcherSuggestionsService } from '../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { PrivilegeChecker } from '../lib/services/privilege_checker/privilege_checker';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';
import { SpaceUiSettingsClientToken } from '../settings/tokens';

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(AlertActionsClient).toSelf().inRequestScope();
  bind(AlertEventsClient).toSelf().inRequestScope();
  bind(EpisodesClient).toSelf().inRequestScope();
  bind(RulesClient).toSelf().inRequestScope();
  bind(InternalRulesClientProvider).toSelf().inSingletonScope();
  bind(InternalRulesClient).toSelf().inSingletonScope();
  bind(EventOriginActorToken).toConstantValue('user');
  bind(RulesClientOptionsToken).toConstantValue({});
  bind(ArtifactTypeRegistry).toSelf().inSingletonScope();
  bind(RequestSpaceIdToken)
    .toResolvedValue(
      (request, spaces) => spaces.spacesService.getSpaceId(request),
      [Request, PluginStart<AlertingServerStartDependencies['spaces']>('spaces')]
    )
    .inRequestScope();
  bind(ActionPolicyNamespaceToken)
    .toResolvedValue(
      (request, spaces) =>
        spaces.spacesService.spaceIdToNamespace(spaces.spacesService.getSpaceId(request)),
      [Request, PluginStart<AlertingServerStartDependencies['spaces']>('spaces')]
    )
    .inRequestScope();
  bind(ActionPolicyClient).toSelf().inRequestScope();
  bind(ActionPolicyExecutionHistoryClient).toSelf().inRequestScope();
  bind(RuleTemplatesClient).toSelf().inRequestScope();
  bind(ExecutionHistoryClient).toSelf().inRequestScope();
  bind(ExecutionHistoryClientToken).toService(ExecutionHistoryClient);
  bind(UserService).toSelf().inRequestScope();
  bind(ApiKeyService).toSelf().inRequestScope();
  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(RetryServiceToken).toService(AlertingRetryService);

  bind(LoggerService).toSelf().inSingletonScope();
  bind(LoggerServiceToken).toService(LoggerService);

  bind(ChangeHistoryClientToken)
    .toResolvedValue(
      (logger, env) =>
        createChangeHistoryClient({
          logger: logger.get('rule_changes_history'),
          kibanaVersion: env.packageInfo.version,
        }),
      [Logger, PluginInitializer('env')]
    )
    .inSingletonScope();
  bind(RuleChangesHistoryService).toSelf().inSingletonScope();
  bind(RuleChangesHistoryServiceToken).toService(RuleChangesHistoryService);
  bind(RuleChangesHistoryClient).toSelf().inRequestScope();
  bind(RuleChangesHistoryClientToken).toService(RuleChangesHistoryClient);

  bind(UiSettingsClientToken)
    .toResolvedValue(
      (savedObjects, uiSettings) =>
        uiSettings.globalAsScopedToClient(savedObjects.createInternalRepository()),
      [CoreStart('savedObjects'), CoreStart('uiSettings')]
    )
    .inSingletonScope();
  bind(SettingsService).toSelf().inRequestScope();
  bind(SettingsServiceToken).toService(SettingsService);

  bind(SpaceUiSettingsClientToken)
    .toResolvedValue(
      async (savedObjectsClientFactory, uiSettings) =>
        uiSettings.asScopedToClient(await savedObjectsClientFactory()),
      [SavedObjectsClientFactory, CoreStart('uiSettings')]
    )
    .inRequestScope();

  bind(EventLogService).toSelf().inSingletonScope();
  bind(EventLogServiceToken).toService(EventLogService);
  bind(WorkflowService).toSelf().inSingletonScope();
  bind(WorkflowServiceToken).toService(WorkflowService);
  bind(LicenseService).toSelf().inSingletonScope();
  bind(LicenseServiceToken).toService(LicenseService);
  bind(EbtService).toSelf().inSingletonScope();
  bind(EbtServiceToken).toService(EbtService);
  bind(ResourceManager).toSelf().inSingletonScope();

  bind(EsServiceInternalToken)
    .toResolvedValue(
      (elasticsearch) => elasticsearch.client.asInternalUser,
      [CoreStart('elasticsearch')]
    )
    .inSingletonScope();

  bind(EsServiceScopedToken)
    .toResolvedValue(
      (request, elasticsearch) => elasticsearch.client.asScoped(request).asCurrentUser,
      [Request, CoreStart('elasticsearch')]
    )
    .inRequestScope();

  bind(EsServiceScopedSpaceRoutingToken)
    .toResolvedValue(
      (request, elasticsearch) =>
        // `projectRouting: 'space'` scopes rule-execution queries to the originating space/project
        // when CPS is enabled, matching alerting v1 behavior. Only `asCurrentUser` honors the option.
        elasticsearch.client.asScoped(request, { projectRouting: 'space' }).asCurrentUser,
      [Request, CoreStart('elasticsearch')]
    )
    .inRequestScope();

  // Task Manager is a dependency of this plugin, so it can begin polling and run
  // a task before this plugin's start lifecycle binds `CoreStart('injection')`.
  // Resolving it eagerly would throw when the binding is not yet available. The
  // promise resolves on the plugin's `OnStart` hook, at which point the injection
  // service is guaranteed to be bound, so task runs wait until the plugin starts.
  const injectionPromise = new Promise<CoreDiServiceStart>((resolve) => {
    bind(OnStart).toConstantValue(
      once((container) => {
        resolve(container.get(CoreStart('injection')));
      })
    );
  });

  bind(TaskRunnerFactoryToken).toFactory(() => createTaskRunnerFactory({ injectionPromise }));

  bind(RuleSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({ includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE] }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  // The `alerting_rule_template` type is hidden and owned by the alerting (v1)
  // plugin, so it has to be opted into explicitly here.
  bind(RuleTemplateSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({ includedHiddenTypes: [RULE_TEMPLATE_SAVED_OBJECT_TYPE] }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  bind(RulesSavedObjectService).toSelf().inRequestScope();
  bind(RulesSavedObjectServiceScopedToken).toService(RulesSavedObjectService);
  bind(RulesSavedObjectServiceInternalToken)
    .toResolvedValue(
      (savedObjects, spaces) =>
        new RulesSavedObjectService(
          savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE]),
          spaces
        ),
      [CoreStart('savedObjects'), PluginStart<AlertingServerStartDependencies['spaces']>('spaces')]
    )
    .inSingletonScope();

  bind(MaintenanceWindowSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjects) =>
        savedObjects.createInternalRepository([MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE]),
      [CoreStart('savedObjects')]
    )
    .inSingletonScope();

  bind(MaintenanceWindowServiceInternalToken)
    .toResolvedValue(
      (client, logger) => new MaintenanceWindowService(client, logger),
      [MaintenanceWindowSavedObjectsClientToken, LoggerServiceToken]
    )
    .inSingletonScope();

  bind(EncryptedSavedObjectsClientToken)
    .toResolvedValue(
      (eso) => eso.getClient({ includedHiddenTypes: [ACTION_POLICY_SAVED_OBJECT_TYPE] }),
      [
        PluginStart<AlertingServerStartDependencies['encryptedSavedObjects']>(
          'encryptedSavedObjects'
        ),
      ]
    )
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
    .toResolvedValue(
      (savedObjects, spaces, esoClient) =>
        new ActionPolicySavedObjectService(
          savedObjects.createInternalRepository([ACTION_POLICY_SAVED_OBJECT_TYPE]),
          spaces,
          esoClient
        ),
      [
        CoreStart('savedObjects'),
        PluginStart<AlertingServerStartDependencies['spaces']>('spaces'),
        EncryptedSavedObjectsClientToken,
      ]
    )
    .inSingletonScope();

  bind(ApiKeyServiceSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjects) => savedObjects.createInternalRepository([API_KEY_PENDING_INVALIDATION_TYPE]),
      [CoreStart('savedObjects')]
    )
    .inSingletonScope();

  // Singleton so the feature flag is subscribed to once per process, and every
  // QueryService flavor plus the rule-executor step read the same resolved format.
  bind(EsqlResponseFormatService).toSelf().inSingletonScope();
  bind(EsqlResponseFormatServiceToken).toService(EsqlResponseFormatService);

  bind(QueryServiceScopedToken)
    .toResolvedValue(
      (loggerService, esClient, format) => new QueryService(esClient, loggerService, format),
      [LoggerServiceToken, EsServiceScopedToken, EsqlResponseFormatServiceToken]
    )
    .inRequestScope();

  // Rule-execution queries run against user data and must respect the space project routing.
  bind(QueryServiceScopedSpaceRoutingToken)
    .toResolvedValue(
      (loggerService, esClient, format) => new QueryService(esClient, loggerService, format),
      [LoggerServiceToken, EsServiceScopedSpaceRoutingToken, EsqlResponseFormatServiceToken]
    )
    .inRequestScope();

  bind(QueryServiceInternalToken)
    .toResolvedValue(
      (loggerService, esClient, format) => new QueryService(esClient, loggerService, format),
      [LoggerServiceToken, EsServiceInternalToken, EsqlResponseFormatServiceToken]
    )
    .inSingletonScope();

  bind(StorageServiceScopedToken)
    .toResolvedValue(
      (loggerService, esClient) => new StorageService(esClient, loggerService),
      [LoggerServiceToken, EsServiceScopedToken]
    )
    .inRequestScope();

  bind(StorageServiceInternalToken)
    .toResolvedValue(
      (loggerService, esClient) => new StorageService(esClient, loggerService),
      [LoggerServiceToken, EsServiceInternalToken]
    )
    .inSingletonScope();

  bind(WorkflowsManagementApiToken)
    .toResolvedValue(
      (wfm) => wfm.management,
      [PluginSetup<AlertingServerSetupDependencies['workflowsManagement']>('workflowsManagement')]
    )
    .inSingletonScope();

  // `cloud` is an optional plugin dependency. Expressing an optional single
  // dependency is idiomatic with `get(token, { optional: true })`, so this
  // binding intentionally stays on `toDynamicValue`.
  bind(KibanaBaseUrlToken)
    .toDynamicValue(({ get }) => {
      const http = get(CoreStart('http'));
      const cloud = get(PluginSetup<AlertingServerSetupDependencies['cloud']>('cloud'), {
        optional: true,
      });
      return getKibanaBaseUrl(http, cloud);
    })
    .inSingletonScope();

  bind(MatcherSuggestionsService).toSelf().inRequestScope();
  bind(PrivilegeChecker).toSelf().inRequestScope();

  bind(DispatcherService).toSelf().inSingletonScope();
  bind(DispatcherServiceInternalToken).toService(DispatcherService);

  bind(DirectorService).toSelf().inSingletonScope();
  bind(TransitionStrategyFactory).toSelf().inSingletonScope();

  bind(TransitionStrategyToken).to(CountTimeframeStrategy).inSingletonScope();
  bind(TransitionStrategyToken).to(BasicTransitionStrategy).inSingletonScope();
}
