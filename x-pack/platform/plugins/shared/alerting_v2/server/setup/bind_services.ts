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
import { AlertingResourcesService } from '../lib/services/alerting_resources_service';
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

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(RulesClient).toSelf().inRequestScope();

  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(AlertingResourcesService).toSelf().inSingletonScope();
  bind(LoggerService).toSelf().inSingletonScope();
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
      const request = get(Request);
      const elasticsearch = get(CoreStart('elasticsearch'));
      const loggerService = get(LoggerService);
      const esClient = elasticsearch.client.asScoped(request).asCurrentUser;
      return new StorageService(esClient, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const elasticsearch = get(CoreStart('elasticsearch'));
      const loggerService = get(LoggerService);
      const esClient = elasticsearch.client.asInternalUser;
      return new StorageService(esClient, loggerService);
    })
    .inSingletonScope();
}
