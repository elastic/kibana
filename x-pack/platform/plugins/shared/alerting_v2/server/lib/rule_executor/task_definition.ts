/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PluginSetup } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';

import type { PluginConfig } from '../../config';
import type { RuleExecutorTaskParams } from './types';
import { ALERT_EVENTS_INDEX } from './constants';
import { buildAlertEventsFromEsqlResponse } from './build_alert_events';
import { getQueryPayload } from './get_query_payload';
import { AlertingResourcesService } from '../services/alerting_resources_service';
import { RulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service';
import { QueryService } from '../services/query_service/query_service';
import { TaskRunScopeService } from '../services/task_run_scope_service/task_run_scope_service';
import { LoggerService } from '../services/logger_service/logger_service';
import type { AlertingServerSetupDependencies } from '../../types';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';

export const ALERTING_RULE_EXECUTOR_TASK_TYPE = 'alerting:esql' as const;

@injectable()
export class RuleExecutorTaskDefinition {
  constructor(
    @inject(PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager'))
    private readonly taskManager: AlertingServerSetupDependencies['taskManager'],
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(PluginInitializer('config')) private readonly pluginConfig: { get(): PluginConfig },
    @inject(AlertingResourcesService) private readonly resourcesService: AlertingResourcesService,
    @inject(TaskRunScopeService) private readonly taskRunScopeService: TaskRunScopeService
  ) {}

  public register() {
    const config = this.pluginConfig.get();
    const logger = this.logger;
    const resourcesService = this.resourcesService;

    this.taskManager.registerTaskDefinitions({
      [ALERTING_RULE_EXECUTOR_TASK_TYPE]: {
        title: 'Alerting v2 rule executor (ES|QL)',
        timeout: '5m',
        paramsSchema: schema.object({
          ruleId: schema.string(),
          spaceId: schema.string(),
        }),
        createTaskRunner: ({ taskInstance, abortController, fakeRequest }: RunContext) => {
          return {
            run: async () => {
              if (!config.enabled) {
                return { state: taskInstance.state };
              }

              if (!fakeRequest) {
                throw new Error(
                  `Cannot execute rule executor task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
                );
              }

              const params = taskInstance.params as RuleExecutorTaskParams;
              // Wait for the plugin-wide resource initialization started during plugin setup.
              await resourcesService.waitUntilReady();

              const { services, dispose } = this.taskRunScopeService.getScopedServices(
                fakeRequest,
                [RulesSavedObjectService, QueryService, StorageServiceInternalToken] as const
              );

              try {
                const [rulesSavedObjectService, queryService, storageService] = services;

                const ruleAttributes = await rulesSavedObjectService.getRuleAttributes({
                  id: params.ruleId,
                  spaceId: params.spaceId,
                });

                logger.debug({
                  message: () =>
                    `Rule saved object attributes: ${JSON.stringify(ruleAttributes, null, 2)}`,
                });

                if (!ruleAttributes.enabled) {
                  return { state: taskInstance.state };
                }

                const { filter, params: queryParams } = getQueryPayload({
                  query: ruleAttributes.query,
                  timeField: ruleAttributes.timeField,
                  lookbackWindow: ruleAttributes.lookbackWindow,
                });

                logger.debug({
                  message: () =>
                    `executing ES|QL query for rule ${params.ruleId} in space ${
                      params.spaceId
                    } - ${JSON.stringify({
                      query: ruleAttributes.query,
                      filter,
                      params: queryParams,
                    })}`,
                });

                let esqlResponse: Awaited<ReturnType<QueryService['executeQuery']>>;
                try {
                  esqlResponse = await queryService.executeQuery({
                    query: ruleAttributes.query,
                    filter,
                    params: queryParams,
                    abortSignal: abortController.signal,
                  });
                } catch (error) {
                  if (abortController.signal.aborted) {
                    throw new Error('Search has been aborted due to cancelled execution');
                  }
                  throw error;
                }

                logger.debug({
                  message: () =>
                    `ES|QL response values: ${JSON.stringify(esqlResponse.values, null, 2)}`,
                });

                const targetDataStream = ALERT_EVENTS_INDEX;

                const scheduledAt = taskInstance.scheduledAt;
                const scheduledTimestamp =
                  (typeof scheduledAt === 'string' ? scheduledAt : undefined) ??
                  (taskInstance.startedAt instanceof Date
                    ? taskInstance.startedAt.toISOString()
                    : undefined) ??
                  new Date().toISOString();

                const alertDocs = buildAlertEventsFromEsqlResponse({
                  input: {
                    ruleId: params.ruleId,
                    spaceId: params.spaceId,
                    ruleAttributes,
                    esqlResponse,
                    scheduledTimestamp,
                  },
                });

                await storageService.bulkIndexDocs({
                  index: targetDataStream,
                  docs: alertDocs.map(({ doc }) => doc),
                  getId: (_doc, i) => alertDocs[i].id,
                });

                logger.debug({
                  message: `alerting_v2:esql run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream}`,
                });

                return { state: {} };
              } catch (e) {
                if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
                  // Rule was deleted.
                  return { state: taskInstance.state };
                }
                throw e;
              } finally {
                dispose();
              }
            },
          };
        },
      },
    });
  }
}
