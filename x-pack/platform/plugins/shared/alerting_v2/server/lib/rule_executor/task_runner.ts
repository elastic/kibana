/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from '@kbn/core-di-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';

import type { PluginConfig } from '../../config';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import { buildAlertEventsFromEsqlResponse } from './build_alert_events';
import { getQueryPayload } from './get_query_payload';
import { ResourceManager } from '../services/resource_service/resource_manager';
import { RulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service';
import { QueryService } from '../services/query_service/query_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import type { StorageService } from '../services/storage_service/storage_service';
import type { RuleExecutorTaskParams } from './types';
import { LoggerService } from '../services/logger_service/logger_service';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(PluginInitializer('config')) private readonly pluginConfig: { get(): PluginConfig },
    @inject(ResourceManager) private readonly resourcesService: ResourceManager,
    @inject(RulesSavedObjectService) private readonly rulesSavedObjectService: RulesSavedObjectService,
    @inject(QueryService) private readonly queryService: QueryService,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageService
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    if (!this.pluginConfig.get().enabled) {
      return { state: taskInstance.state };
    }

    // Wait for the plugin-wide resource initialization started during plugin setup.
    await this.resourcesService.waitUntilReady();

    const params = taskInstance.params as RuleExecutorTaskParams;

    try {
      const ruleAttributes = await this.rulesSavedObjectService.getRuleAttributes({
        id: params.ruleId,
        spaceId: params.spaceId,
      });

      this.logger.debug({
        message: () => `Rule saved object attributes: ${JSON.stringify(ruleAttributes, null, 2)}`,
      });

      if (!ruleAttributes.enabled) {
        return { state: taskInstance.state };
      }

      const { filter, params: queryParams } = getQueryPayload({
        query: ruleAttributes.query,
        timeField: ruleAttributes.timeField,
        lookbackWindow: ruleAttributes.lookbackWindow,
      });

      this.logger.debug({
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
        esqlResponse = await this.queryService.executeQuery({
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

      this.logger.debug({
        message: () => `ES|QL response values: ${JSON.stringify(esqlResponse.values, null, 2)}`,
      });

      const targetDataStream = ALERT_EVENTS_DATA_STREAM;

      const scheduledAt = taskInstance.scheduledAt;
      const scheduledTimestamp =
        (typeof scheduledAt === 'string' ? scheduledAt : undefined) ??
        (taskInstance.startedAt instanceof Date ? taskInstance.startedAt.toISOString() : undefined) ??
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

      await this.storageService.bulkIndexDocs({
        index: targetDataStream,
        docs: alertDocs.map(({ doc }) => doc),
        getId: (_doc, i) => alertDocs[i].id,
      });

      this.logger.debug({
        message: `alerting_v2:esql run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream}`,
      });

      return { state: {} };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        // Rule was deleted.
        return { state: taskInstance.state };
      }
      throw e;
    }
  }
}
