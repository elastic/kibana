/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';

import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import { buildAlertEventsFromEsqlResponse } from './build_alert_events';
import { getQueryPayload } from './get_query_payload';
import type { ResourceManagerContract } from '../services/resource_service/resource_manager';
import { ResourceManager } from '../services/resource_service/resource_manager';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryService } from '../services/query_service/query_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import type { RuleExecutorTaskParams } from './types';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { LoggerServiceToken } from '../services/logger_service/logger_service';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(ResourceManager) private readonly resourcesService: ResourceManagerContract,
    @inject(RulesSavedObjectService)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract,
    @inject(QueryService) private readonly queryService: QueryServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    // Wait for the plugin-wide resource initialization started during plugin setup.
    await this.resourcesService.waitUntilReady();

    const params = taskInstance.params as RuleExecutorTaskParams;

    const ruleDoc = await this.rulesSavedObjectService
      .get(params.ruleId, params.spaceId)
      .catch((error) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    if (!ruleDoc) {
      // Rule was deleted.
      return { state: taskInstance.state };
    }

    this.logger.debug({
      message: () => `Rule saved object attributes: ${JSON.stringify(ruleDoc.attributes, null, 2)}`,
    });

    if (!ruleDoc.attributes.enabled) {
      return { state: taskInstance.state };
    }

    const { filter, params: queryParams } = getQueryPayload({
      query: ruleDoc.attributes.query,
      timeField: ruleDoc.attributes.timeField,
      lookbackWindow: ruleDoc.attributes.lookbackWindow,
    });

    this.logger.debug({
      message: () =>
        `executing ES|QL query for rule ${params.ruleId} in space ${
          params.spaceId
        } - ${JSON.stringify({
          query: ruleDoc.attributes.query,
          filter,
          params: queryParams,
        })}`,
    });

    let esqlResponse: Awaited<ReturnType<QueryService['executeQuery']>>;
    try {
      esqlResponse = await this.queryService.executeQuery({
        query: ruleDoc.attributes.query,
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
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      ruleAttributes: ruleDoc.attributes,
      esqlResponse,
      scheduledTimestamp,
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
  }
}
