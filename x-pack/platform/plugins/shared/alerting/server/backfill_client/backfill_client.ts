/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ISavedObjectsRepository,
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import {
  RunContext,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskPriority,
} from '@kbn/task-manager-plugin/server';
import { IEventLogger, IEventLogClient } from '@kbn/event-log-plugin/server';
import { isNumber } from 'lodash';
import { ActionsClient } from '@kbn/actions-plugin/server';
import {
  ScheduleBackfillError,
  ScheduleBackfillParams,
  ScheduleBackfillResult,
  ScheduleBackfillResults,
} from '../application/backfill/methods/schedule/types';
import { Backfill } from '../application/backfill/result/types';
import {
  transformBackfillParamToAdHocRun,
  transformAdHocRunToBackfillResult,
} from '../application/backfill/transforms';
import { RuleDomain } from '../application/rule/types';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { AdHocRunAuditAction, adHocRunAuditEvent } from '../rules_client/common/audit_events';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { TaskRunnerFactory } from '../task_runner';
import { RuleTypeRegistry } from '../types';
import { createBackfillError } from './lib';
import { updateGaps } from '../lib/rule_gaps/update/update_gaps';
import { denormalizeActions } from '../rules_client/lib/denormalize_actions';
import { DenormalizedAction, NormalizedAlertActionWithGeneratedValues } from '../rules_client';

export const BACKFILL_TASK_TYPE = 'ad_hoc_run-backfill';

interface ConstructorOpts {
  logger: Logger;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
  taskRunnerFactory: TaskRunnerFactory;
}

interface BulkQueueOpts {
  actionsClient: ActionsClient;
  auditLogger?: AuditLogger;
  params: ScheduleBackfillParams;
  rules: RuleDomain[];
  ruleTypeRegistry: RuleTypeRegistry;
  spaceId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  eventLogClient: IEventLogClient;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  eventLogger: IEventLogger | undefined;
}

interface DeleteBackfillForRulesOpts {
  ruleIds: string[];
  namespace?: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export class BackfillClient {
  private logger: Logger;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.taskManagerStartPromise = opts.taskManagerStartPromise;

    // Registers the task that handles the backfill using the ad hoc task runner
    opts.taskManagerSetup.registerTaskDefinitions({
      [BACKFILL_TASK_TYPE]: {
        title: 'Alerting Backfill Rule Run',
        priority: TaskPriority.Low,
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  public async bulkQueue({
    actionsClient,
    auditLogger,
    params,
    rules,
    ruleTypeRegistry,
    spaceId,
    unsecuredSavedObjectsClient,
    eventLogClient,
    internalSavedObjectsRepository,
    eventLogger,
  }: BulkQueueOpts): Promise<ScheduleBackfillResults> {
    const adHocSOsToCreate: Array<SavedObjectsBulkCreateObject<AdHocRunSO>> = [];

    /**
     * soToCreateIndexOrErrorMap contains a map of the original request index to the
     * AdHocRunSO to create index in the adHocSOsToCreate array or any errors
     * encountered while processing the request
     *
     * For example, if the original request has 5 entries, 2 of which result in errors,
     * the map will look like:
     *
     * params: [request1, request2, request3, request4, request5]
     * adHocSOsToCreate: [AdHocRunSO1, AdHocRunSO3, AdHocRunSO4]
     * soToCreateIndexOrErrorMap: {
     *   0: 0,
     *   1: error1,
     *   2: 1,
     *   3: 2,
     *   4: error2
     * }
     *
     * This allows us to return a response in the same order the requests were received
     */

    const soToCreateIndexOrErrorMap: Map<number, number | ScheduleBackfillError> = new Map();
    const rulesWithUnsupportedActions = new Set<number>();

    for (let ndx = 0; ndx < params.length; ndx++) {
      const param = params[ndx];
      // For this schedule request, look up the rule or return error
      const { rule, error } = getRuleOrError({
        ruleId: param.ruleId,
        rules,
        ruleTypeRegistry,
      });
      if (rule) {
        // keep track of index of this request in the adHocSOsToCreate array
        soToCreateIndexOrErrorMap.set(ndx, adHocSOsToCreate.length);
        const reference: SavedObjectReference = {
          id: rule.id,
          name: `rule`,
          type: RULE_SAVED_OBJECT_TYPE,
        };

        const { actions, hasUnsupportedActions, references } = await extractRuleActions({
          actionsClient,
          rule,
          runActions: param.runActions,
        });

        if (hasUnsupportedActions) {
          rulesWithUnsupportedActions.add(ndx);
        }

        adHocSOsToCreate.push({
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: transformBackfillParamToAdHocRun(param, rule, actions, spaceId),
          references: [reference, ...references],
        });
      } else if (error) {
        // keep track of the error encountered for this request by index so
        // we can return it in order
        soToCreateIndexOrErrorMap.set(ndx, error);
        this.logger.warn(
          `Error for ruleId ${param.ruleId} - not scheduling backfill for ${JSON.stringify(param)}`
        );
      }
    }

    // Every request encountered an error, so short-circuit the logic here
    if (!adHocSOsToCreate.length) {
      return params.map(
        (_, ndx: number) => soToCreateIndexOrErrorMap.get(ndx) as ScheduleBackfillError
      );
    }

    // Bulk create the saved object
    const bulkCreateResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRunSO>(
      adHocSOsToCreate
    );

    const transformedResponse: ScheduleBackfillResults = bulkCreateResponse.saved_objects.map(
      (so: SavedObject<AdHocRunSO>, index: number) => {
        if (so.error) {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              error: new Error(so.error.message),
            })
          );
        } else {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              savedObject: { type: AD_HOC_RUN_SAVED_OBJECT_TYPE, id: so.id },
            })
          );
        }
        return transformAdHocRunToBackfillResult({
          adHocRunSO: so,
          isSystemAction: (id: string) => actionsClient.isSystemAction(id),
          originalSO: adHocSOsToCreate?.[index],
        });
      }
    );

    /**
     * Use soToCreateIndexOrErrorMap to build the result array that returns
     * the bulkQueue result in the same order of the request
     *
     * For example, if we have 3 entries in the bulkCreateResponse
     *
     * bulkCreateResult: [AdHocRunSO1, AdHocRunSO3, AdHocRunSO4]
     * soToCreateIndexOrErrorMap: {
     *   0: 0,
     *   1: error1,
     *   2: 1,
     *   3: 2,
     *   4: error2
     * }
     *
     * The following result would be returned
     * result: [AdHocRunSO1, error1, AdHocRunSO3, AdHocRunSO4, error2]
     */
    const createSOResult = Array.from(soToCreateIndexOrErrorMap.keys()).map((ndx: number) => {
      const indexOrError = soToCreateIndexOrErrorMap.get(ndx);

      if (isNumber(indexOrError)) {
        // This number is the index of the response from the savedObjects bulkCreate function
        const response = transformedResponse[indexOrError];
        if (rulesWithUnsupportedActions.has(indexOrError)) {
          return {
            ...response,
            warnings: [
              `Rule has actions that are not supported for backfill. Those actions will be skipped.`,
            ],
          };
        }
        return response;
      } else {
        // Return the error we encountered
        return indexOrError as ScheduleBackfillError;
      }
    });

    // Build array of tasks to schedule
    const adHocTasksToSchedule: TaskInstance[] = [];
    const backfillSOs: Backfill[] = [];
    createSOResult.forEach((result: ScheduleBackfillResult) => {
      if (!(result as ScheduleBackfillError).error) {
        const createdSO = result as Backfill;
        backfillSOs.push(createdSO);
        const ruleTypeTimeout = ruleTypeRegistry.get(createdSO.rule.alertTypeId).ruleTaskTimeout;
        adHocTasksToSchedule.push({
          id: createdSO.id,
          taskType: BACKFILL_TASK_TYPE,
          ...(ruleTypeTimeout ? { timeoutOverride: ruleTypeTimeout } : {}),
          state: {},
          params: {
            adHocRunParamsId: createdSO.id,
            spaceId,
          },
        });
      }
    });

    try {
      // Process backfills in chunks of 10 to manage resource usage
      for (let i = 0; i < backfillSOs.length; i += 10) {
        const chunk = backfillSOs.slice(i, i + 10);
        await Promise.all(
          chunk.map((backfill) =>
            updateGaps({
              backfillSchedule: backfill.schedule,
              ruleId: backfill.rule.id,
              start: new Date(backfill.start),
              end: backfill?.end ? new Date(backfill.end) : new Date(),
              eventLogger,
              eventLogClient,
              savedObjectsRepository: internalSavedObjectsRepository,
              logger: this.logger,
              backfillClient: this,
              actionsClient,
            })
          )
        );
      }
    } catch {
      this.logger.warn(
        `Error updating gaps for backfill jobs: ${backfillSOs
          .map((backfill) => backfill.id)
          .join(', ')}`
      );
    }

    if (adHocTasksToSchedule.length > 0) {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.bulkSchedule(adHocTasksToSchedule);
    }

    return createSOResult;
  }

  public async deleteBackfillForRules({
    ruleIds,
    namespace,
    unsecuredSavedObjectsClient,
  }: DeleteBackfillForRulesOpts) {
    try {
      // query for all ad hoc runs that reference this ruleId
      const adHocRunFinder = await unsecuredSavedObjectsClient.createPointInTimeFinder<AdHocRunSO>({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: ruleIds.map((ruleId) => ({ id: ruleId, type: RULE_SAVED_OBJECT_TYPE })),
        ...(namespace ? { namespaces: [namespace] } : undefined),
      });

      const adHocRuns: Array<SavedObjectsFindResult<AdHocRunSO>> = [];
      for await (const response of adHocRunFinder.find()) {
        adHocRuns.push(...response.saved_objects);
      }
      await adHocRunFinder.close();

      if (adHocRuns.length > 0) {
        const deleteResult = await unsecuredSavedObjectsClient.bulkDelete(
          adHocRuns.map((adHocRun) => ({
            id: adHocRun.id,
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          }))
        );

        const deleteErrors = deleteResult.statuses.filter((status) => !!status.error);
        if (deleteErrors.length > 0) {
          this.logger.warn(
            `Error deleting backfill jobs with IDs: ${deleteErrors
              .map((status) => status.id)
              .join(', ')} with errors: ${deleteErrors.map(
              (status) => status.error?.message
            )} - jobs and associated task were not deleted.`
          );
        }

        // only delete tasks if the associated ad hoc runs were successfully deleted
        const taskIdsToDelete = deleteResult.statuses
          .filter((status) => status.success)
          .map((status) => status.id);

        // delete the associated tasks
        const taskManager = await this.taskManagerStartPromise;
        const deleteTaskResult = await taskManager.bulkRemove(taskIdsToDelete);
        const deleteTaskErrors = deleteTaskResult.statuses.filter((status) => !!status.error);
        if (deleteTaskErrors.length > 0) {
          this.logger.warn(
            `Error deleting tasks with IDs: ${deleteTaskErrors
              .map((status) => status.id)
              .join(', ')} with errors: ${deleteTaskErrors.map((status) => status.error?.message)}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error deleting backfill jobs for rule IDs: ${ruleIds.join(',')} - ${error.message}`
      );
    }
  }

  public async findOverlappingBackfills({
    ruleId,
    start,
    end,
    savedObjectsRepository,
    actionsClient,
  }: {
    ruleId: string;
    start: Date;
    end: Date;
    savedObjectsRepository: ISavedObjectsRepository;
    actionsClient: ActionsClient;
  }) {
    const adHocRuns: Array<SavedObjectsFindResult<AdHocRunSO>> = [];

    // Create a point in time finder for efficient pagination
    const adHocRunFinder = await savedObjectsRepository.createPointInTimeFinder<AdHocRunSO>({
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      perPage: 100,
      hasReference: [{ id: ruleId, type: RULE_SAVED_OBJECT_TYPE }],
      filter: `
        ad_hoc_run_params.attributes.start <= "${end.toISOString()}" and
        ad_hoc_run_params.attributes.end >= "${start.toISOString()}"
      `,
    });

    try {
      // Collect all results using async iterator
      for await (const response of adHocRunFinder.find()) {
        adHocRuns.push(...response.saved_objects);
      }
    } finally {
      // Make sure we always close the finder
      await adHocRunFinder.close();
    }

    return adHocRuns.map((data) =>
      transformAdHocRunToBackfillResult({
        adHocRunSO: data,
        isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
      })
    );
  }
}

interface GetRuleOrErrorOpts {
  ruleId: string;
  rules: RuleDomain[];
  ruleTypeRegistry: RuleTypeRegistry;
}

function getRuleOrError({ ruleId, rules, ruleTypeRegistry }: GetRuleOrErrorOpts): {
  rule?: RuleDomain;
  error?: ScheduleBackfillError;
} {
  const rule = rules.find((r: RuleDomain) => r.id === ruleId);

  // if rule not found, return not found error
  if (!rule) {
    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      RULE_SAVED_OBJECT_TYPE,
      ruleId
    );
    return {
      error: createBackfillError(notFoundError.output.payload.message, ruleId),
    };
  }

  // if rule exists, check that it is enabled
  if (!rule.enabled) {
    return { error: createBackfillError(`Rule ${ruleId} is disabled`, ruleId, rule.name) };
  }

  // check that the rule type is supported
  const isLifecycleRule = ruleTypeRegistry.get(rule.alertTypeId).autoRecoverAlerts ?? true;
  if (isLifecycleRule) {
    return {
      error: createBackfillError(
        `Rule type "${rule.alertTypeId}" for rule ${ruleId} is not supported`,
        ruleId,
        rule.name
      ),
    };
  }

  // check that the API key is not null
  if (!rule.apiKey) {
    return {
      error: createBackfillError(`Rule ${ruleId} has no API key`, ruleId, rule.name),
    };
  }

  return { rule };
}

interface ExtractRuleActions {
  actionsClient: ActionsClient;
  rule: RuleDomain;
  runActions?: boolean;
}

interface ExtractRuleActionsResult {
  actions: DenormalizedAction[];
  hasUnsupportedActions: boolean;
  references: SavedObjectReference[];
}

async function extractRuleActions({
  actionsClient,
  rule,
  runActions,
}: ExtractRuleActions): Promise<ExtractRuleActionsResult> {
  // defauts to true if not specified
  const shouldRunActions = runActions !== undefined ? runActions : true;

  if (!shouldRunActions) {
    return { hasUnsupportedActions: false, actions: [], references: [] };
  }

  const ruleLevelNotifyWhen = rule.notifyWhen;
  const normalizedActions = [];
  for (const action of rule.actions) {
    // if action level frequency is not defined and rule level notifyWhen is, set the action level frequency
    if (!action.frequency && ruleLevelNotifyWhen) {
      normalizedActions.push({
        ...action,
        frequency: { notifyWhen: ruleLevelNotifyWhen, summary: false, throttle: null },
      });
    } else {
      normalizedActions.push(action);
    }
  }

  const hasUnsupportedActions = normalizedActions.some(
    (action) => action.frequency?.notifyWhen !== 'onActiveAlert'
  );

  const allActions = [
    ...normalizedActions.filter((action) => action.frequency?.notifyWhen === 'onActiveAlert'),
    ...(rule.systemActions ?? []),
  ] as NormalizedAlertActionWithGeneratedValues[];

  const { references, actions } = await denormalizeActions(actionsClient, allActions);

  return { hasUnsupportedActions, actions, references };
}
