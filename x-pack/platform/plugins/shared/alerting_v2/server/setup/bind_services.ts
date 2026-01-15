/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { RuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { RulesClient } from '../lib/rules_client';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { LoggerService } from '../lib/services/logger_service/logger_service';
import { QueryService } from '../lib/services/query_service/query_service';
import { AlertingRetryService } from '../lib/services/retry_service';
import { RulesSavedObjectService } from '../lib/services/rules_saved_object_service/rules_saved_object_service';
import { TaskRunScopeService } from '../lib/services/task_run_scope_service/task_run_scope_service';
import { StorageService } from '../lib/services/storage_service/storage_service';
import {
  StorageServiceInternalToken,
  StorageServiceScopedToken,
} from '../lib/services/storage_service/tokens';
import type { AlertingServerStartDependencies } from '../types';
import { RetryServiceToken } from '../lib/services/retry_service/tokens';
import { EsServiceInternalToken, EsServiceScopedToken } from '../lib/services/es_service/tokens';

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(RulesClient).toSelf().inRequestScope();
  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(RetryServiceToken).toService(AlertingRetryService);

  bind(LoggerService).toSelf().inSingletonScope();
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
  bind(TaskRunScopeService).toSelf().inSingletonScope();
  bind(RulesSavedObjectService).toSelf().inRequestScope();
  bind(RuleExecutorTaskDefinition).toSelf().inSingletonScope();

  bind(QueryService)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const data = get(PluginStart<AlertingServerStartDependencies['data']>('data'));
      const loggerService = get(LoggerService);
      const searchClient = data.search.asScoped(request);
      return new QueryService(searchClient, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const esClient = get(EsServiceScopedToken);
      return new StorageService(esClient, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const esClient = get(EsServiceInternalToken);
      return new StorageService(esClient, loggerService);
    })
    .inSingletonScope();
}
