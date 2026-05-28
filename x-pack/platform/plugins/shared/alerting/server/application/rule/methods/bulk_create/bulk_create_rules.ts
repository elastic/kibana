/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { updateMeta } from '../../../../rules_client/lib';
import {
  API_KEY_GENERATE_CONCURRENCY,
  DEFAULT_BULK_CREATE_BATCH_SIZE,
  MAX_BULK_CREATE_BATCH_SIZE,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
} from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type {
  ApiKeyEntry,
  BatchResult,
  BulkCreateOperationError,
  BulkCreateRulesItem,
  BulkCreateRulesParams,
  BulkCreateRulesResult,
  PreparedRule,
} from './types';
import {
  buildTaskInstance,
  collectNewKeysToInvalidate,
  demotePreparedRules,
  flushKeysToInvalidate,
  prepareRule,
  preValidate,
} from './utils';

export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<BulkCreateRulesResult> {
  const { rules, exitEarlyOnError = false } = params;
  const { logger } = context;
  const total = rules.length;

  if (total === 0) {
    return { successfulIds: [], errors: [], total: 0 };
  }

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `bulkCreateRules: ${total} rules exceeds the hard limit of ${MAX_RULES_NUMBER_FOR_BULK_OPERATION}. ` +
        `Callers should enforce request-level limits before invoking this method.`
    );
  }

  const requestedBatchSize = params.batchSize ?? DEFAULT_BULK_CREATE_BATCH_SIZE;
  const batchSize = Math.max(1, Math.min(MAX_BULK_CREATE_BATCH_SIZE, requestedBatchSize));

  if (requestedBatchSize !== batchSize) {
    logger.warn(
      `bulkCreateRules: batchSize ${requestedBatchSize} clamped to ${batchSize} (hard cap ${MAX_BULK_CREATE_BATCH_SIZE}).`
    );
  }

  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();
  const successfulIds: string[] = [];
  const errors: BulkCreateOperationError[] = [];

  const inputs = rules.map((rule) => ({
    id: rule.options?.id ?? SavedObjectsUtils.generateId(),
    rule,
  }));

  // Phase A: Validate in-memory (schema, rule type enabled, check params, etc...). Then authorize consumer/alertTypeId pairs.
  const { validated, errors: validationErrors } = await preValidate({ context, inputs });
  errors.push(...validationErrors);

  if (validationErrors.length > 0 && exitEarlyOnError) {
    logger.warn(
      `bulkCreateRules: exiting early on preValidate; ${validationErrors.length} rule(s) failed pre-flight, zero ES writes.`
    );
    return { successfulIds, errors, total };
  }
  if (validated.length === 0) {
    return { successfulIds, errors, total };
  }

  const totalBatches = Math.ceil(validated.length / batchSize);
  logger.debug(
    `bulkCreateRules: ${total} input(s), ${validated.length} validated after preValidate, ${totalBatches}x batches of ${batchSize}.`
  );

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * batchSize;
    const batch = validated.slice(start, start + batchSize);

    // Phase B: per-batch ES writes.
    const result = await runBatch<Params>({
      context,
      username,
      actionsClient,
      batch,
    });

    successfulIds.push(...result.successfulIds);
    errors.push(...result.errors);

    if (exitEarlyOnError && result.soFailureOccurred) {
      logger.warn(
        `bulkCreateRules: exiting early on SO failure at batch ${
          batchIndex + 1
        }/${totalBatches}. ` +
          `${successfulIds.length} rule(s) created, ${
            validated.length - start - batch.length
          } rule(s) skipped.`
      );
      break;
    }
  }

  return { successfulIds, errors, total };
}

interface RunBatchArgs<Params extends RuleParams> {
  context: RulesClientContext;
  username: string | null;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  batch: Array<{ id: string; rule: BulkCreateRulesItem<Params> }>;
}

async function runBatch<Params extends RuleParams>({
  context,
  username,
  actionsClient,
  batch,
}: RunBatchArgs<Params>): Promise<BatchResult> {
  const { logger } = context;

  // NOTE: in order to minimise external calls, the values below get mutated
  // at different stages in the process (ie if we fail schedule creation).
  const preparedRules = new Map<string, PreparedRule>();
  const keysToInvalidate = new Set<string>();
  const apiKeysMap = new Map<string, ApiKeyEntry>();
  const errors: BulkCreateOperationError[] = [];

  // Phase B1: per-rule prepare (high latency validation + API key generation).
  await pMap(
    batch,
    async ({ id, rule }) => {
      const { prepared, error } = await prepareRule({
        context,
        actionsClient,
        username,
        id,
        rule,
        errors,
        apiKeysMap,
      });
      if (prepared) preparedRules.set(id, prepared);
      else if (error) errors.push(error);
    },
    { concurrency: API_KEY_GENERATE_CONCURRENCY }
  );

  // No survivors? Flush any keys created and return.
  if (preparedRules.size === 0) {
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { successfulIds: [], errors, soFailureOccurred: false };
  }

  // Phase B2: check schedule-limit on the enabled subset; demote on overflow.
  const enabled = [...preparedRules.values()].filter((p) => p.enabled);

  if (enabled.length > 0) {
    const validationPayload = await validateScheduleLimit({
      context,
      updatedInterval: enabled.map((r) => r.schedule.interval),
    });
    if (validationPayload) {
      const enabledIds = enabled.map((p) => p.id);
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

  // Phase B3: schedule tasks for the surviving enabled subset.
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

  // Phase B4: bulk SO create (no overwrite — id collisions surface as per-row 409).
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
    // Whole-call SO failure: invalidate keys, best-effort task cleanup.
    // Surface as batch-wide SO failure so exitEarlyOnError can honour it.
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
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
    await flushKeysToInvalidate(keysToInvalidate, context);
    errors.push({
      message: `Failed to bulk create rule saved objects: ${error.message}`,
      status: error.output?.statusCode,
      rule: { id: 'n/a', name: 'n/a' },
    });
    return { successfulIds: [], errors, soFailureOccurred: true };
  }

  // Phase B4 per-row outcomes.
  const batchSuccessfulIds: string[] = [];
  const taskIdsToCleanUp: string[] = [];
  let perRowFailureOccurred = false;

  for (const so of bulkResponse.saved_objects) {
    if (so.error) {
      perRowFailureOccurred = true;
      errors.push({
        message: so.error.message ?? 'n/a',
        status: so.error.statusCode,
        rule: { id: so.id, name: preparedRules.get(so.id)?.name ?? 'n/a' },
      });

      const apiKey = apiKeysMap.get(so.id);
      if (apiKey) {
        for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
      }

      // Only ids we scheduled in Phase B3. Skipping caller-supplied id collisions
      // avoids nuking a pre-existing rule's task on a 409.
      if (newlyScheduledTaskIds.has(so.id)) {
        taskIdsToCleanUp.push(so.id);
      }
    } else {
      batchSuccessfulIds.push(so.id);
      if (newlyScheduledTaskIds.has(so.id)) {
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

  // Single per-batch flush for all collected key invalidations.
  await flushKeysToInvalidate(keysToInvalidate, context);

  return {
    successfulIds: batchSuccessfulIds,
    errors,
    soFailureOccurred: perRowFailureOccurred,
  };
}
