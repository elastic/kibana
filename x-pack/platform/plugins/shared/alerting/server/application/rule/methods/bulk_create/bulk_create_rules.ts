/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { RuleChangeTrackingAction, type RuleChangeTracking } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleCircuitBreakerErrorMessage, parseDuration } from '../../../../../common';
import { addGeneratedActionValues, updateMeta } from '../../../../rules_client/lib';
import { validateRuleTypeParams } from '../../../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  API_KEY_GENERATE_CONCURRENCY,
  DEFAULT_BULK_CREATE_BATCH_SIZE,
  MAX_BULK_CREATE_BATCH_SIZE,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
} from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule } from '../../../../types';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import { createRuleDataSchema } from '../create/schemas';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type {
  ApiKeyEntry,
  BatchResult,
  BulkCreateRulesItem,
  BulkCreateRulesParams,
  BulkCreateRulesResult,
  PreparedRule,
} from './types';
import {
  buildTaskInstance,
  collectNewKeysToInvalidate,
  flushKeysToInvalidate,
  prepareRule,
} from './utils';
import { logRuleChanges } from '../common_utils/log_rule_changes';

export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<BulkCreateRulesResult> {
  const { rules, exitEarlyOnError = false, changeTracking } = params;
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
  const errors: BulkOperationError[] = [];

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

  // Phase B: per-batch ES writes.
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const batch = validated.slice(start, start + batchSize);

    const result = await runBatch<Params>({
      context,
      username,
      actionsClient,
      batch,
      changeTracking,
      strict: exitEarlyOnError,
    });

    successfulIds.push(...result.successfulIds);
    errors.push(...result.errors);

    if (exitEarlyOnError && result.errors.length > 0) {
      logger.warn(`bulkCreateRules: exiting early at batch ${i + 1}/${totalBatches}.`);
      break;
    }
  }

  return { successfulIds, errors, total };
}

async function preValidate<Params extends RuleParams>({
  context,
  inputs,
}: {
  context: RulesClientContext;
  inputs: Array<{ id: string; rule: BulkCreateRulesItem<Params> }>;
}): Promise<{
  validated: Array<{ id: string; rule: BulkCreateRulesItem<Params> }>;
  errors: BulkOperationError[];
}> {
  const validated = new Map<string, { id: string; rule: BulkCreateRulesItem<Params> }>();
  const errors: BulkOperationError[] = [];
  const authPairs = new Map<
    string,
    { ruleTypeId: string; consumer: string; ids: string[]; names: Map<string, string> }
  >();

  // Phase A1: per-rule in-memory checks, sequential, cheapest-first.
  await withSpan({ name: 'preValidate.checkInMemory', type: 'rules' }, async () => {
    for (const { id, rule } of inputs) {
      try {
        const { actions: genActions, systemActions: genSystemActions } =
          await addGeneratedActionValues(rule.data.actions, rule.data.systemActions, context);
        const data = { ...rule.data, actions: genActions, systemActions: genSystemActions };

        try {
          createRuleDataSchema.validate(data);
        } catch (err) {
          throw Boom.badRequest(`Error validating create data - ${err.message}`);
        }

        // ruleTypeRegistry.get throws 400 if not registered.
        const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
        context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);
        validateRuleTypeParams(data.params, ruleType.validate.params);

        const intervalInMs = parseDuration(data.schedule.interval);
        if (
          intervalInMs < context.minimumScheduleIntervalInMs &&
          context.minimumScheduleInterval.enforce
        ) {
          throw Boom.badRequest(
            `Error creating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
          );
        }
        if (
          intervalInMs < context.minimumScheduleIntervalInMs &&
          !context.minimumScheduleInterval.enforce
        ) {
          context.logger.warn(
            `Rule schedule interval (${data.schedule.interval}) for "${ruleType.id}" rule type with ID "${id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
          );
        }

        const authzKey = `${data.alertTypeId}::${data.consumer}`;
        const pair = authPairs.get(authzKey);
        if (pair) {
          pair.ids.push(id);
          pair.names.set(id, data.name);
        } else {
          authPairs.set(authzKey, {
            ruleTypeId: data.alertTypeId,
            consumer: data.consumer,
            ids: [id],
            names: new Map([[id, data.name]]),
          });
        }

        validated.set(id, { id, rule });
      } catch (err) {
        errors.push({
          message: err.message,
          status: err.output?.statusCode,
          rule: { id, name: rule.data?.name ?? 'n/a' },
        });
      }
    }
  });

  if (validated.size === 0) {
    return { validated: [], errors };
  }

  // Phase A2: deduped per-pair authorization.
  await withSpan({ name: 'preValidate.ensureAuthorized', type: 'rules' }, async () => {
    for (const { ruleTypeId, consumer, ids, names } of authPairs.values()) {
      try {
        await context.authorization.ensureAuthorized({
          ruleTypeId,
          consumer,
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (authzError) {
        // One audit per rule in failing set. Following single rule `create()`.
        for (const ruleId of ids) {
          context.auditLogger?.log(
            ruleAuditEvent({
              action: RuleAuditAction.CREATE,
              savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: names.get(ruleId)! },
              error: authzError,
            })
          );
          errors.push({
            message: authzError.message,
            status: authzError.output?.statusCode,
            rule: { id: ruleId, name: names.get(ruleId) ?? 'n/a' },
          });
          validated.delete(ruleId);
        }
      }
    }
  });

  return { validated: [...validated.values()], errors };
}

interface RunBatchArgs<Params extends RuleParams> {
  context: RulesClientContext;
  username: string | null;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  batch: Array<{ id: string; rule: BulkCreateRulesItem<Params> }>;
  changeTracking?: RuleChangeTracking;
  strict?: boolean;
}

async function runBatch<Params extends RuleParams>({
  context,
  username,
  actionsClient,
  batch,
  changeTracking,
  strict = false,
}: RunBatchArgs<Params>): Promise<BatchResult> {
  const { logger } = context;

  // NOTE: the values below get mutated at different stages
  // in the process (ie if we fail schedule creation).
  const preparedRules = new Map<string, PreparedRule>();
  const keysToInvalidate = new Set<string>();
  const apiKeysMap = new Map<string, ApiKeyEntry>();
  const errors: BulkOperationError[] = [];

  // Phase B1: per-rule prepare (high latency validation + API key generation).
  await withSpan({ name: 'runBatch.pMap.prepareRule', type: 'rules' }, () =>
    pMap(
      batch,
      async ({ id, rule }) => {
        const { prepared, error } = await prepareRule({
          context,
          actionsClient,
          username,
          id,
          rule,
          apiKeysMap,
        });
        if (prepared) preparedRules.set(id, prepared);
        else if (error) errors.push(error);
      },
      { concurrency: API_KEY_GENERATE_CONCURRENCY }
    )
  );

  if (strict && errors.length > 0) {
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { successfulIds: [], errors };
  }

  // No survivors? Flush any keys created and return.
  if (preparedRules.size === 0) {
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { successfulIds: [], errors };
  }

  // Phase B2: check schedule-limit on the enabled subset; exclude on overflow.
  const enabled = [...preparedRules.values()].filter((p) => p.enabled);

  if (enabled.length > 0) {
    const validationPayload = await withSpan(
      { name: 'runBatch.validateScheduleLimit', type: 'rules' },
      () =>
        validateScheduleLimit({
          context,
          updatedInterval: enabled.map((r) => r.schedule.interval),
        })
    );
    if (validationPayload) {
      const message = getRuleCircuitBreakerErrorMessage({
        interval: validationPayload.interval,
        intervalAvailable: validationPayload.intervalAvailable,
        action: 'bulkCreate',
        rules: enabled.length,
      });
      logger.debug(`Excluding ${enabled.length} rule(s) from batch: schedule limit exceeded.`);
      for (const { id, name } of enabled) {
        const apiKey = apiKeysMap.get(id);
        if (apiKey) {
          for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
          apiKeysMap.delete(id);
        }
        preparedRules.delete(id);
        errors.push({ message, rule: { id, name } });
      }
    }
  }

  if (strict && errors.length > 0) {
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { successfulIds: [], errors };
  }

  // Phase B3: schedule tasks for the surviving enabled subset.
  const survivingEnabled = [...preparedRules.values()].filter((p) => p.enabled);
  const newlyScheduledTaskIds = new Set<string>();

  if (survivingEnabled.length > 0) {
    const tasksToSchedule = survivingEnabled.map((p) => buildTaskInstance(context, p));

    try {
      const scheduledTasks = await withSpan({ name: 'runBatch.bulkSchedule', type: 'tasks' }, () =>
        context.taskManager.bulkSchedule(tasksToSchedule)
      );
      scheduledTasks.forEach((t) => newlyScheduledTaskIds.add(t.id));

      // Silent per-task drops: bulkSchedule's `taskInstanceToAttributes` logs+skips
      // invalid instances. Diff requested vs returned and exclude the missing ones.
      const dropped = survivingEnabled.filter((p) => !newlyScheduledTaskIds.has(p.id));
      if (dropped.length > 0) {
        logger.warn(`Excluding ${dropped.length} rule(s) from batch: task validation failed.`);
        const message =
          'Task scheduling silently dropped this rule (validation failure in task store)';
        for (const { id, name } of dropped) {
          const apiKey = apiKeysMap.get(id);
          if (apiKey) {
            for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
            apiKeysMap.delete(id);
          }
          preparedRules.delete(id);
          errors.push({ message, rule: { id, name } });
        }
      }
    } catch (error) {
      // Whole-call TM throw: exclude enabled subset from the batch, continue.
      logger.warn(
        `Excluding ${survivingEnabled.length} rule(s) from batch: task scheduling failed.`
      );
      const message = `Failed to schedule tasks: ${error.message}`;
      const status = error.output?.statusCode;
      for (const { id, name } of survivingEnabled) {
        const apiKey = apiKeysMap.get(id);
        if (apiKey) {
          for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
          apiKeysMap.delete(id);
        }
        preparedRules.delete(id);
        errors.push({ message, status, rule: { id, name } });
      }
    }
  }

  if (strict && errors.length > 0) {
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
    if (newlyScheduledTaskIds.size > 0) {
      await context.taskManager.bulkRemove([...newlyScheduledTaskIds]);
    }
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { successfulIds: [], errors };
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
    bulkResponse = await withSpan({ name: 'runBatch.bulkCreateRulesSo', type: 'rules' }, () =>
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
    const message = `Failed to bulk create rule saved objects: ${error.message}`;
    const status = error.output?.statusCode;
    for (const { id, name } of preparedRules.values()) {
      errors.push({ message, status, rule: { id, name } });
    }
    return { successfulIds: [], errors };
  }

  // Phase B4 per-row outcomes.
  const createTime = Date.now();
  const batchSuccessfulIds: string[] = [];
  const taskIdsToCleanUp: string[] = [];
  const successfulSavedObjects: Array<SavedObject<RawRule>> = [];

  for (const so of bulkResponse.saved_objects) {
    if (so.error) {
      errors.push({
        message: so.error.message ?? 'Error saving rule SO',
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
      successfulSavedObjects.push(so as SavedObject<RawRule>);
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

  // Per-rule change-history entries for SOs that actually persisted.
  if (successfulSavedObjects.length > 0) {
    await logRuleChanges({
      ruleSOs: successfulSavedObjects,
      rulesClientContext: context,
      changesContext: {
        action: changeTracking?.action ?? RuleChangeTrackingAction.ruleCreate,
        timestamp: createTime,
        metadata: changeTracking?.metadata,
      },
    });
  }

  return { successfulIds: batchSuccessfulIds, errors };
}
