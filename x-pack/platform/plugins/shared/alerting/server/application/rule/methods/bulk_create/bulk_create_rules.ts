/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { updateMeta } from '../../../../rules_client/lib';
import { API_KEY_GENERATE_CONCURRENCY } from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { bulkEnableTasks } from '../bulk_enable_tasks';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule, SanitizedRule } from '../../../../types';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type { BulkCreateRulesParams, BulkCreateRulesResult } from './types';
import {
  buildTaskInstance,
  collectNewKeysToInvalidate,
  demotePreparedRules,
  flushKeysToInvalidate,
  prepareRule,
  toSanitizedRule,
} from './utils';
import type { ApiKeyEntry, PreparedRule } from './utils';

export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<BulkCreateRulesResult<Params>> {
  const { rules } = params;
  const { logger } = context;
  const total = rules.length;

  if (total === 0) {
    return { rules: [], errors: [], total: 0, taskIdsFailedToBeEnabled: [] };
  }

  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();

  const inputsWithIds = rules.map((rule) => ({
    id: rule.options?.id ?? SavedObjectsUtils.generateId(),
    rule,
  }));

  logger.debug(`Bulk creating batch of ${total} rules`);

  // Phase 1: per-rule prepare (validation + api key generation).
  // NOTE: in order to minimise external calls, the values below get mutated
  // at different stages in the process (ie if we fail schedule creation),
  // so that we invalidate keys and create rule SOs in a single batch at the end.
  const preparedRules = new Map<string, PreparedRule>();
  const keysToInvalidate = new Set<string>();
  const apiKeysMap = new Map<string, ApiKeyEntry>();
  const errors: BulkOperationError[] = [];
  const authzCache = new Map<string, Promise<void>>();

  await pMap(
    inputsWithIds,
    async ({ id, rule }) => {
      const { prepared, error } = await prepareRule({
        context,
        actionsClient,
        username,
        id,
        rule,
        authzCache,
        errors,
        apiKeysMap,
      });
      if (prepared) preparedRules.set(id, prepared);
      else if (error) errors.push(error);
    },
    { concurrency: API_KEY_GENERATE_CONCURRENCY }
  );

  // No survivors? Flush out any keys created and return
  if (preparedRules.size === 0) {
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { rules: [], errors, total, taskIdsFailedToBeEnabled: [] };
  }

  // Phase 2: validate schedule-limits, enabled subset only.
  const enabled = [...preparedRules.values()].filter((p) => p.enabled);

  if (enabled.length > 0) {
    const updatedInterval = enabled.map((r) => r.schedule.interval);
    const validationPayload = await validateScheduleLimit({ context, updatedInterval });
    const enabledIds = enabled.map((p) => p.id);
    if (validationPayload) {
      const reasonMessage = getRuleCircuitBreakerErrorMessage({
        interval: validationPayload.interval,
        intervalAvailable: validationPayload.intervalAvailable,
        action: 'bulkCreate',
        rules: enabledIds.length,
      });
      logger.debug(`Demoting ${enabledIds.length} rules -> disabled, schedule limit exceeded.`);
      demotePreparedRules({
        ids: enabledIds,
        reason: 'schedule_limit_exceeded',
        message: reasonMessage,
        preparedRules,
        apiKeysMap,
        keysToInvalidate,
        errors,
        username,
      });
    }
  }

  // Phase 3: schedule tasks for the surviving enabled subset.
  const survivingEnabled = [...preparedRules.values()].filter((p) => p.enabled);
  const newlyScheduledTaskIds = new Set<string>();

  if (survivingEnabled.length > 0) {
    const tasksToSchedule = survivingEnabled.map((preparedRule) =>
      buildTaskInstance(context, preparedRule)
    );

    let scheduledIds: string[] = [];
    const survivingEnabledIds = survivingEnabled.map((p) => p.id);
    try {
      const scheduledTasks = await withSpan(
        { name: 'taskManager.bulkSchedule', type: 'tasks' },
        () => context.taskManager.bulkSchedule(tasksToSchedule)
      );
      scheduledIds = scheduledTasks.map((task) => task.id);
    } catch (error) {
      // Whole-call TM throw: demote enabled subset to disabled, continue.
      logger.warn(
        `Demoting ${survivingEnabledIds.length} rules -> disabled, task scheduling failed.`
      );
      demotePreparedRules({
        ids: survivingEnabledIds,
        reason: 'task_schedule_failed',
        message: `Failed to schedule tasks: ${error.message}`,
        preparedRules,
        apiKeysMap,
        keysToInvalidate,
        errors,
        username,
      });
    }

    if (scheduledIds.length > 0) {
      scheduledIds.forEach((id) => newlyScheduledTaskIds.add(id));
    }

    // Silent per-task drops: bulkSchedule's `taskInstanceToAttributes` validation
    // logs+skips invalid instances. Diff requested vs returned and demote the missing ones.
    if (preparedRules.size > 0 && scheduledIds.length < survivingEnabledIds.length) {
      const returned = new Set(scheduledIds);
      const dropped = survivingEnabledIds.filter((id) => !returned.has(id));
      if (dropped.length > 0) {
        logger.warn(`Demoting ${dropped.length} rules -> disabled, task validation failed.`);
        demotePreparedRules({
          ids: dropped,
          reason: 'task_validation_failed',
          message: 'Task scheduling silently dropped this rule (validation failure in task store)',
          preparedRules,
          apiKeysMap,
          keysToInvalidate,
          errors,
          username,
        });
      }
    }
  }

  // Audit per-rule CREATE event before persistence (mirrors createRuleSavedObject).
  for (const prepared of preparedRules.values()) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: prepared.id, name: prepared.name },
      })
    );
  }

  // Phase 4: bulk SO create (no overwrite — id collisions surface as per-row 409)
  const bulkObjects: Array<SavedObjectsBulkCreateObject<RawRule>> = [...preparedRules.values()].map(
    (prepared) => ({
      type: RULE_SAVED_OBJECT_TYPE,
      id: prepared.id,
      attributes: updateMeta(context, prepared.rawRule),
      references: prepared.references,
    })
  );

  let bulkResponse;
  try {
    bulkResponse = await withSpan(
      { name: 'unsecuredSavedObjectsClient.bulkCreate', type: 'rules' },
      () =>
        bulkCreateRulesSo({
          savedObjectsClient: context.unsecuredSavedObjectsClient,
          bulkCreateRuleAttributes: bulkObjects,
        })
    );
  } catch (error) {
    // Whole-call SO failure (auth, timeout, etc): invalidate every newly-minted
    // key, best-effort orphan-task cleanup, then rethrow.
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
    await flushKeysToInvalidate(keysToInvalidate, context);
    if (newlyScheduledTaskIds.size > 0) {
      try {
        await context.taskManager.bulkRemove([...newlyScheduledTaskIds]);
      } catch (cleanupError) {
        logger.error(
          `bulkCreateRules: failed to clean up tasks ${[...newlyScheduledTaskIds].join(
            ', '
          )} after SO bulkCreate threw: ${cleanupError.message}`
        );
      }
    }
    throw error;
  }

  // Phase 4 per-row outcomes.
  const successfulSos: Array<SavedObject<RawRule>> = [];
  const taskIdsToEnable: string[] = [];
  const taskIdsToCleanUp: string[] = [];

  for (const so of bulkResponse.saved_objects) {
    if (so.error) {
      errors.push({
        message: so.error.message ?? 'n/a',
        status: so.error.statusCode,
        rule: { id: so.id, name: preparedRules.get(so.id)?.name ?? 'n/a' },
      });

      const apiKey = apiKeysMap.get(so.id);
      if (apiKey) {
        for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
      }

      // Only ids we scheduled in Phase 3. Skipping caller-supplied id collisions
      // avoids nuking a pre-existing rule's task on a 409.
      if (newlyScheduledTaskIds.has(so.id)) {
        taskIdsToCleanUp.push(so.id);
      }
    } else {
      successfulSos.push(so as SavedObject<RawRule>);
      if (newlyScheduledTaskIds.has(so.id)) {
        taskIdsToEnable.push(so.id);
        // Audit per-rule ENABLE for the enabled subset (mirrors single-rule semantics).
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.ENABLE,
            outcome: 'unknown',
            savedObject: {
              type: RULE_SAVED_OBJECT_TYPE,
              id: so.id,
              name: preparedRules.get(so.id)?.name,
            },
          })
        );
      }
    }
  }

  // Single batched TM cleanup for per-row failures.
  if (taskIdsToCleanUp.length > 0) {
    try {
      logger.warn(`Cleaning up ${taskIdsToCleanUp.length} tasks where SO creation failed.`);
      await context.taskManager.bulkRemove(taskIdsToCleanUp);
    } catch (cleanupError) {
      logger.error(
        `bulkCreateRules: failed to clean up tasks ${taskIdsToCleanUp.join(
          ', '
        )} after SO per-row errors: ${cleanupError.message}`
      );
    }
  }

  // Phase 5: enable scheduled tasks. If skipTaskEnabling, caller enables them later.
  const taskIdsFailedToBeEnabled = params.skipTaskEnabling
    ? [...taskIdsToEnable]
    : (await bulkEnableTasks(context, { taskIds: taskIdsToEnable })).taskIdsFailedToBeEnabled;

  // Single end-of-function flush for all collected key invalidations.
  await flushKeysToInvalidate(keysToInvalidate, context);

  // Phase 6: domain transform + return.
  const sanitizedRules: Array<SanitizedRule<Params>> = successfulSos.map((so) =>
    toSanitizedRule<Params>(context, so, context.ruleTypeRegistry)
  );

  return {
    rules: sanitizedRules,
    errors,
    total,
    taskIdsFailedToBeEnabled,
  };
}
