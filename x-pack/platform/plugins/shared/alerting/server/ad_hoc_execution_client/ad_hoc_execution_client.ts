/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectsRepository,
  Logger,
  SavedObjectReference,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type {
  TaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
  RunContext,
} from '@kbn/task-manager-plugin/server';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import type { IEventLogger, IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  ExecutionError,
  ScheduleExecutionParams,
  ScheduleExecutionResults,
  AdHocRunResult,
} from '../application/ad_hoc/types';
import {
  transformAdHocRunToBackfillResult,
  transformBackfillParamToAdHocRun,
} from '../application/backfill/transforms';
import type { RuleDomain } from '../application/rule/types';
import type { AdHocRunSO } from '../data/ad_hoc_run/types';
import { AdHocRunAuditAction, adHocRunAuditEvent } from '../rules_client/common/audit_events';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import { createExecutionError } from '../application/ad_hoc/lib/create_execution_error';
import type { TaskRunnerFactory } from '../task_runner';

import { AD_HOC_TASK_TYPE } from '../application/ad_hoc/constants';

interface ConstructorOpts {
  logger: Logger;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
  taskRunnerFactory: TaskRunnerFactory;
}

interface QueueAdHocExecutionOpts {
  auditLogger?: AuditLogger;
  params: ScheduleExecutionParams;
  rules: RuleDomain[];
  spaceId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  eventLogClient: IEventLogClient;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  eventLogger: IEventLogger | undefined;
}

export class AdHocExecutionClient {
  private logger: Logger;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.taskManagerStartPromise = opts.taskManagerStartPromise;

    opts.taskManagerSetup.registerTaskDefinitions({
      [AD_HOC_TASK_TYPE]: {
        title: 'Alerting Ad-hoc Rule Run',
        priority: TaskPriority.Low,
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  public async queueAdHocExecution({
    auditLogger,
    params,
    rules,
    spaceId,
    unsecuredSavedObjectsClient,
  }: QueueAdHocExecutionOpts): Promise<ScheduleExecutionResults> {
    const adHocSOsToCreate: Array<SavedObjectsBulkCreateObject<AdHocRunSO>> = [];
    const soToCreateIndexOrErrorMap: Map<number, number | ExecutionError> = new Map();

    for (let ndx = 0; ndx < params.length; ndx++) {
      const param = params[ndx];
      // simplified rule lookup - we expect the rule to be passed in rules array
      const rule = rules.find((r) => r.id === param.ruleId);

      if (rule) {
        soToCreateIndexOrErrorMap.set(ndx, adHocSOsToCreate.length);

        const references: SavedObjectReference[] = [
          {
            name: 'rule',
            type: 'rule',
            id: rule.id,
          },
        ];

        const start = param.start ?? new Date().toISOString();
        const end = param.end ?? new Date().toISOString();

        const attributes = transformBackfillParamToAdHocRun(
          {
            ruleId: rule.id,
            ranges: [{ start, end }],
            runActions: false,
            initiator: param.initiator,
            initiatorId: param.initiatorId,
          },
          rule,
          [],
          spaceId
        );

        adHocSOsToCreate.push({
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes,
          references,
        });
      } else {
        const error = createExecutionError(`Rule not found for ID ${param.ruleId}`, param.ruleId);
        soToCreateIndexOrErrorMap.set(ndx, error);
        this.logger.warn(
          `Error for ruleId ${param.ruleId} - not scheduling ad-hoc execution for ${JSON.stringify(
            param
          )}`
        );
      }
    }

    if (!adHocSOsToCreate.length) {
      return params.map((_, ndx: number) => soToCreateIndexOrErrorMap.get(ndx) as ExecutionError);
    }

    // Create Saved Objects
    const response = await unsecuredSavedObjectsClient.bulkCreate<AdHocRunSO>(adHocSOsToCreate);

    // Process results
    const createdSOs = response.saved_objects;

    const transformedResponse: ScheduleExecutionResults = [];

    // Map back to original order and transform
    for (let ndx = 0; ndx < params.length; ndx++) {
      const indexOrError = soToCreateIndexOrErrorMap.get(ndx);
      if (typeof indexOrError === 'number') {
        const so = createdSOs[indexOrError];
        if (so.error) {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              error: new Error(so.error.message),
            })
          );
          transformedResponse.push(createExecutionError(so.error.message, params[ndx].ruleId));
        } else {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              savedObject: { type: AD_HOC_RUN_SAVED_OBJECT_TYPE, id: so.id },
            })
          );

          const result = transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction: (id: string) => true, // System action check not relevant here? Or pass dummy
            originalSO: adHocSOsToCreate[indexOrError],
          });

          transformedResponse.push(result);
        }
      } else {
        transformedResponse.push(indexOrError as ExecutionError);
      }
    }

    // Schedule Tasks
    const adHocTasksToSchedule: TaskInstance[] = [];
    transformedResponse.forEach((result) => {
      if (!('error' in result)) {
        const createdSO = result as AdHocRunResult;
        // We don't have ruleTypeRegistry here easily to check timeout,
        // but we can pass it or just default.
        adHocTasksToSchedule.push({
          id: createdSO.id,
          taskType: AD_HOC_TASK_TYPE,
          state: {},
          params: {
            adHocRunParamsId: createdSO.id,
            spaceId,
          },
        });
      }
    });

    if (adHocTasksToSchedule.length > 0) {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.bulkSchedule(adHocTasksToSchedule);
    }

    return transformedResponse;
  }
}
