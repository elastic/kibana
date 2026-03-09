/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { DirectorService } from '../lib/director/director';
import { BasicTransitionStrategy } from '../lib/director/strategies/basic_strategy';
import { CountTimeframeStrategy } from '../lib/director/strategies/count_timeframe_strategy';
import { TransitionStrategyFactory } from '../lib/director/strategies/strategy_resolver';
import { TransitionStrategyToken } from '../lib/director/strategies/types';
import { DispatcherService } from '../lib/dispatcher/dispatcher';
import { DispatcherServiceInternalToken } from '../lib/dispatcher/tokens';
import { NotificationPolicyClient } from '../lib/notification_policy_client';
import { RulesClient } from '../lib/rules_client';
import { ApiKeyService } from '../lib/services/api_key_service/api_key_service';
import { EsServiceInternalToken, EsServiceScopedToken } from '../lib/services/es_service/tokens';
import { LoggerService, LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { NotificationPolicySavedObjectService } from '../lib/services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import {
  NotificationPolicySavedObjectServiceInternalToken,
  NotificationPolicySavedObjectServiceScopedToken,
} from '../lib/services/notification_policy_saved_object_service/tokens';
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
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { AlertingServerStartDependencies } from '../types';

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(AlertActionsClient).toSelf().inRequestScope();
  bind(RulesClient).toSelf().inRequestScope();
  bind(NotificationPolicyClient).toSelf().inRequestScope();
  bind(UserService).toSelf().inRequestScope();
  bind(ApiKeyService).toSelf().inRequestScope();
  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(RetryServiceToken).toService(AlertingRetryService);

  bind(LoggerService).toSelf().inSingletonScope();
  bind(LoggerServiceToken).toService(LoggerService);
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

  bind(RulesSavedObjectService).toSelf().inRequestScope();
  bind(RulesSavedObjectServiceScopedToken).toService(RulesSavedObjectService);
  bind(RulesSavedObjectServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      const internalClient = savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE]);
      return new RulesSavedObjectService(() => internalClient, spaces);
    })
    .inSingletonScope();

  bind(NotificationPolicySavedObjectService).toSelf().inRequestScope();
  bind(NotificationPolicySavedObjectServiceScopedToken).toService(
    NotificationPolicySavedObjectService
  );
  bind(NotificationPolicySavedObjectServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const savedObjects = get(CoreStart('savedObjects'));
      const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
      const internalClient = savedObjects.createInternalRepository([
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      ]);
      return new NotificationPolicySavedObjectService(() => internalClient, spaces);
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

  bind(DispatcherService).toSelf().inSingletonScope();
  bind(DispatcherServiceInternalToken).toService(DispatcherService);

  bind(DirectorService).toSelf().inSingletonScope();
  bind(TransitionStrategyFactory).toSelf().inSingletonScope();

  // Strategies are registered via TransitionStrategyToken for multi-injection.
  // Order matters: specialized strategies first, fallback (BasicTransitionStrategy) last.
  bind(TransitionStrategyToken).to(CountTimeframeStrategy).inSingletonScope();
  bind(TransitionStrategyToken).to(BasicTransitionStrategy).inSingletonScope();
}
