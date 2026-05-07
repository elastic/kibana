/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import type { SavedObjectsBulkCreateObject, SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { TaskInstanceWithDeprecatedFields } from '@kbn/task-manager-plugin/server/task';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule } from '../../../../types';
import type { RuleDomain, RuleParams } from '../../types';
import { convertRuleIdsToKueryNode } from '../../../../lib';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  retryIfBulkOperationConflicts,
  buildKueryNodeFilter,
  getAndValidateCommonBulkOptions,
  API_KEY_ATTRIBUTES_TO_STRIP,
} from '../../../../rules_client/common';
import type { SanitizedRule } from '../../../../../common';
import { getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import {
  getAuthorizationFilter,
  checkAuthorizationAndGetTotal,
  createNewAPIKeySet,
  updateMetaAttributes,
  bulkMigrateLegacyActions,
  migrateLegacyLastRunOutcomeMsg,
} from '../../../../rules_client/lib';
import type { RulesClientContext, BulkOperationError } from '../../../../rules_client/types';
import { validateScheduleLimit } from '../get_schedule_frequency';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { BulkEnableRulesParams, BulkEnableRulesResult } from './types';
import { bulkEnableRulesParamsSchema } from './schemas';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import { ruleDomainSchema } from '../../schemas';

const getShouldScheduleTask = async (
  context: RulesClientContext,
  scheduledTaskId: string | null | undefined
) => {
  if (!scheduledTaskId) return true;
  try {
    // make sure scheduledTaskId exist
    return await withSpan({ name: 'getShouldScheduleTask', type: 'rules' }, async () => {
      const task = await context.taskManager.get(scheduledTaskId);

      // Check whether task status is unrecognized. If so, we want to delete
      // this task and create a fresh one
      if (task.status === TaskStatus.Unrecognized) {
        await context.taskManager.removeIfExists(scheduledTaskId);
        return true;
      }

      return false;
    });
  } catch (err) {
    return true;
  }
};

export const bulkEnableRules = async <Params extends RuleParams>(
  context: RulesClientContext,
  params: BulkEnableRulesParams
): Promise<BulkEnableRulesResult<Params>> => {
  const { ids, filter } = getAndValidateCommonBulkOptions(params);
  const actionsClient = await context.getActionsClient();

  try {
    bulkEnableRulesParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating bulk enable rules data - ${error.message}`);
  }

  const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
  const authorizationFilter = await getAuthorizationFilter(context, { action: 'ENABLE' });

  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { total } = await checkAuthorizationAndGetTotal(context, {
    filter: kueryNodeFilterWithAuth,
    action: 'ENABLE',
  });

  const { errors, rules, accListSpecificForBulkOperation } = await retryIfBulkOperationConflicts({
    action: 'ENABLE',
    logger: context.logger,
    bulkOperation: (filterKueryNode: KueryNode | null) =>
      bulkEnableRulesWithOCC(context, { filter: filterKueryNode }),
    filter: kueryNodeFilterWithAuth,
  });

  const [taskIdsToEnable] = accListSpecificForBulkOperation;

  const taskIdsFailedToBeEnabled = await tryToEnableTasks({
    taskIdsToEnable,
    logger: context.logger,
    taskManager: context.taskManager,
  });

  const updatedRules = rules.map(({ id, attributes, references }) => {
    // TODO (http-versioning): alertTypeId should never be null, but we need to
    // fix the type cast from SavedObjectsBulkUpdateObject to SavedObjectsBulkUpdateObject
    // when we are doing the bulk delete and this should fix itself
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
    const ruleDomain: RuleDomain<Params> = transformRuleAttributesToRuleDomain<Params>(
      attributes as RawRule,
      {
        id,
        logger: context.logger,
        ruleType,
        references,
        omitGeneratedValues: false,
      },
      (connectorId: string) => actionsClient.isSystemAction(connectorId)
    );

    try {
      ruleDomainSchema.validate(ruleDomain);
    } catch (e) {
      context.logger.warn(`Error validating bulk enable rule domain object for id: ${id}, ${e}`);
    }
    return ruleDomain;
  });

  // // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
  const updatePublicRules = updatedRules.map((rule: RuleDomain<Params>) => {
    return transformRuleDomainToRule<Params>(rule);
  }) as Array<SanitizedRule<Params>>;

  return { errors, rules: updatePublicRules, total, taskIdsFailedToBeEnabled };
};

const bulkEnableRulesWithOCC = async (
  context: RulesClientContext,
  { filter }: { filter: KueryNode | null }
) => {
  const rulesFinder = await withSpan(
    {
      name: 'encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser',
      type: 'rules',
    },
    async () =>
      await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
        {
          filter,
          type: RULE_SAVED_OBJECT_TYPE,
          perPage: 50,
          ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
        }
      )
  );

  const ruleNameToRuleIdMapping: Record<string, string> = {};
  const username = await context.getUserName();

  const errors: BulkOperationError[] = [];
  const taskIdsToEnable: string[] = [];
  const rules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const ruleIdsToClearFlapping: string[] = [];
  const ruleTypeIdsToClearFlapping: Record<string, boolean> = {};

  const intervals: string[] = [];
  let scheduleValidationError = '';

  await withSpan(
    { name: 'Process rules page by page: validate, enable, persist', type: 'rules' },
    async () => {
      for await (const response of rulesFinder.find()) {
        for (const rule of response.saved_objects) {
          const interval = rule.attributes.schedule?.interval;
          if (interval) {
            intervals.push(interval);
          }
        }

        if (!scheduleValidationError) {
          const validationPayload = await validateScheduleLimit({
            context,
            updatedInterval: intervals,
          });

          if (validationPayload) {
            scheduleValidationError = getRuleCircuitBreakerErrorMessage({
              interval: validationPayload.interval,
              intervalAvailable: validationPayload.intervalAvailable,
              action: 'bulkEnable',
              rules: intervals.length,
            });
          }
        }

        await bulkMigrateLegacyActions({ context, rules: response.saved_objects });

        const pageRulesToEnable: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
        const pageTasksToSchedule: TaskInstanceWithDeprecatedFields[] = [];
        const pageRulesToClearFlapping: Array<{ id: string; ruleTypeId: string }> = [];

        for (const rule of response.saved_objects) {
          const ruleName = rule.attributes.name;

          const ruleType = context.ruleTypeRegistry.get(rule.attributes.alertTypeId);
          const { autoRecoverAlerts: isLifecycleAlert } = ruleType;
          try {
            if (scheduleValidationError) {
              throw Error(scheduleValidationError);
            }
            if (rule.attributes.actions.length) {
              try {
                await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
              } catch (error) {
                throw Error(`Rule not authorized for bulk enable - ${error.message}`);
              }
            }
            if (ruleName) {
              ruleNameToRuleIdMapping[rule.id] = ruleName;
            }

            if (isLifecycleAlert) {
              pageRulesToClearFlapping.push({
                id: rule.id,
                ruleTypeId: ruleType.id,
              });
            }

            const nowIso = new Date().toISOString();
            const newApiKeyAttributes = !rule.attributes.apiKey
              ? await createNewAPIKeySet(context, {
                  id: rule.attributes.alertTypeId,
                  ruleName,
                  username,
                  shouldUpdateApiKey: true,
                  apiKeyOwnership: { apiKeyCreatedByUser: rule.attributes.apiKeyCreatedByUser },
                })
              : undefined;

            const updatedAttributes = updateMetaAttributes(context, {
              ...(newApiKeyAttributes
                ? {
                    ...omit(rule.attributes, API_KEY_ATTRIBUTES_TO_STRIP),
                    ...newApiKeyAttributes,
                  }
                : rule.attributes),
              enabled: true,
              updatedBy: username,
              updatedAt: nowIso,
              ...(!rule.attributes.enabled ? { lastEnabledAt: nowIso } : {}),
              executionStatus: {
                status: 'pending',
                lastDuration: 0,
                lastExecutionDate: nowIso,
                error: null,
                warning: null,
              },
              scheduledTaskId: rule.id,
              ...(rule.attributes.lastRun
                ? { lastRun: migrateLegacyLastRunOutcomeMsg(rule.attributes.lastRun) }
                : {}),
            });

            const shouldScheduleTask = await getShouldScheduleTask(
              context,
              rule.attributes.scheduledTaskId
            );

            if (shouldScheduleTask) {
              pageTasksToSchedule.push({
                id: rule.id,
                taskType: `alerting:${rule.attributes.alertTypeId}`,
                schedule: rule.attributes.schedule,
                params: {
                  alertId: rule.id,
                  spaceId: context.spaceId,
                  consumer: rule.attributes.consumer,
                },
                state: {
                  previousStartedAt: null,
                  alertTypeState: {},
                  alertInstances: {},
                },
                scope: ['alerting'],
                enabled: false,
              });
            }

            pageRulesToEnable.push({
              ...rule,
              attributes: updatedAttributes,
            });

            context.auditLogger?.log(
              ruleAuditEvent({
                action: RuleAuditAction.ENABLE,
                outcome: 'unknown',
                savedObject: {
                  type: RULE_SAVED_OBJECT_TYPE,
                  id: rule.id,
                  name: ruleName,
                },
              })
            );
          } catch (error) {
            errors.push({
              message: error.message,
              rule: {
                id: rule.id,
                name: rule.attributes?.name,
              },
            });
            context.auditLogger?.log(
              ruleAuditEvent({
                action: RuleAuditAction.ENABLE,
                savedObject: {
                  type: RULE_SAVED_OBJECT_TYPE,
                  id: rule.id,
                  name: ruleName,
                },
                error,
              })
            );
          }
        }

        if (pageTasksToSchedule.length > 0) {
          await context.taskManager.bulkSchedule(pageTasksToSchedule);
        }

        if (pageRulesToEnable.length > 0) {
          // TODO (http-versioning): for whatever reasoning we are using SavedObjectsBulkUpdateObject
          // everywhere when it should be SavedObjectsBulkCreateObject. We need to fix it in
          // bulk_disable, bulk_enable, etc. to fix this cast
          const result = await bulkCreateRulesSo({
            savedObjectsClient: context.unsecuredSavedObjectsClient,
            bulkCreateRuleAttributes: pageRulesToEnable as Array<
              SavedObjectsBulkCreateObject<RawRule>
            >,
            savedObjectsBulkCreateOptions: { overwrite: true },
          });

          const pageRuleIdsFailedToEnable = new Set<string>();

          result.saved_objects.forEach((rule) => {
            if (rule.error === undefined) {
              if (rule.attributes.scheduledTaskId) {
                taskIdsToEnable.push(rule.attributes.scheduledTaskId);
              }
              rules.push(rule);
            } else {
              pageRuleIdsFailedToEnable.add(rule.id);
              errors.push({
                message: rule.error.message ?? 'n/a',
                status: rule.error.statusCode,
                rule: {
                  id: rule.id,
                  name: ruleNameToRuleIdMapping[rule.id] ?? 'n/a',
                },
              });
            }
          });

          for (const { id, ruleTypeId } of pageRulesToClearFlapping) {
            if (!pageRuleIdsFailedToEnable.has(id)) {
              ruleIdsToClearFlapping.push(id);
              ruleTypeIdsToClearFlapping[ruleTypeId] = true;
            }
          }
        }
      }
      await rulesFinder.close();
    }
  );

  if (context.alertsService && ruleIdsToClearFlapping.length) {
    try {
      await context.alertsService.clearAlertFlappingHistory({
        indices: context.getAlertIndicesAlias(
          Object.keys(ruleTypeIdsToClearFlapping),
          context.spaceId
        ),
        ruleIds: ruleIdsToClearFlapping,
      });
    } catch (error) {
      context.logger.error(
        `Failure to clear flapping history from rule ${JSON.stringify(ruleIdsToClearFlapping)} - ${
          error.message
        }`
      );
    }
  }

  return {
    errors,
    rules: rules as Array<SavedObjectsBulkUpdateObject<RawRule>>,
    accListSpecificForBulkOperation: [taskIdsToEnable],
  };
};

export const tryToEnableTasks = async ({
  taskIdsToEnable,
  logger,
  taskManager,
}: {
  taskIdsToEnable: string[];
  logger: Logger;
  taskManager: TaskManagerStartContract;
}) => {
  const taskIdsFailedToBeEnabled: string[] = [];

  if (taskIdsToEnable.length > 0) {
    try {
      const resultFromEnablingTasks = await withSpan(
        { name: 'taskManager.bulkEnable', type: 'rules' },
        async () => taskManager.bulkEnable(taskIdsToEnable)
      );
      resultFromEnablingTasks?.errors?.forEach((error) => {
        taskIdsFailedToBeEnabled.push(error.id);
      });
      if (resultFromEnablingTasks.tasks.length) {
        logger.debug(
          `Successfully enabled schedules for underlying tasks: ${resultFromEnablingTasks.tasks
            .map((task) => task.id)
            .join(', ')}`
        );
      }
      if (resultFromEnablingTasks.errors.length) {
        logger.error(
          `Failure to enable schedules for underlying tasks: ${resultFromEnablingTasks.errors
            .map((error) => error.id)
            .join(', ')}`
        );
      }
    } catch (error) {
      taskIdsFailedToBeEnabled.push(...taskIdsToEnable);
      logger.error(
        `Failure to enable schedules for underlying tasks: ${taskIdsToEnable.join(
          ', '
        )}. TaskManager bulkEnable failed with Error: ${error.message}`
      );
    }
  }
  return taskIdsFailedToBeEnabled;
};
