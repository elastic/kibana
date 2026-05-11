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
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule, SanitizedRule } from '../../../../types';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type {
  BulkCreateOperationError,
  BulkCreateRulesParams,
  BulkCreateRulesResult,
} from './types';
import {
  buildTaskInstance,
  bulkEnableScheduledTasks,
  collectNewKeysToInvalidate,
  demotePersistedRules,
  flushKeysToInvalidate,
  prepareRule,
  toSanitizedRule,
} from './utils';
import type { ApiKeyEntry, DemotionEntry, PreparedRule } from './utils';

/**
 * Persist-first bulk rule create. 2 parts:
 * 1. Foreground: SO bulkCreate, audit, return.
 * 2. Background (`result.backgroundWork`): Scheduling - limit checks,
 *    task scheduling (created disabled), task enabling via
 *    taskManager.bulkEnable, key invalidation.
 *
 * Returned `rules[]` reflect input intent; the background promise may
 * later demote rules to "disabled" if related tasks failed to schedule.
 */
export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<BulkCreateRulesResult<Params>> {
  const { rules } = params;
  const { logger } = context;
  const total = rules.length;

  if (total === 0) {
    return { rules: [], errors: [], total: 0, backgroundWork: Promise.resolve([]) };
  }

  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();

  const inputsWithIds = rules.map((rule) => ({
    id: rule.options?.id ?? SavedObjectsUtils.generateId(),
    rule,
  }));

  logger.debug(`Bulk creating batch of ${total} rules`);

  // Phase 1: per-rule prepare (per-pair authorization dedupe done first).
  const authzCache = new Map<string, Promise<void>>();
  const preparedRules = new Map<string, PreparedRule>();
  const errors: BulkOperationError[] = [];
  const apiKeysMap = new Map<string, ApiKeyEntry>();
  const keysToInvalidate = new Set<string>();

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

  if (preparedRules.size === 0) {
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { rules: [], errors, total, backgroundWork: Promise.resolve([]) };
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

  // Phase 2: bulk SO create (no overwrite — id collisions surface as per-row 409).
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
    // Nothing was scheduled — invalidate minted keys and rethrow.
    for (const k of collectNewKeysToInvalidate(apiKeysMap.values())) keysToInvalidate.add(k);
    await flushKeysToInvalidate(keysToInvalidate, context);
    throw error;
  }

  // Phase 3: per-row outcome split.
  const successfulSos: Array<SavedObject<RawRule>> = [];
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
        apiKeysMap.delete(so.id);
      }
    } else {
      successfulSos.push(so as SavedObject<RawRule>);
      if (so.attributes.enabled) {
        // Background may later demote this rule and emit a DISABLE audit.
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

  const enabledPersistedIds = successfulSos
    .filter((so) => so.attributes.enabled)
    .map((so) => so.id);

  // Phase 4: detached background work — wrapped so the promise never rejects.
  // Resolves to one error per demoted rule (empty array on full success).
  const backgroundWork = (async (): Promise<BulkCreateOperationError[]> => {
    const bgErrors: BulkCreateOperationError[] = [];
    try {
      const demotedIds = new Map<string, DemotionEntry>();

      // Phase 4A: schedule-limit check.
      if (enabledPersistedIds.length > 0) {
        const updatedInterval = enabledPersistedIds.map(
          (id) => preparedRules.get(id)!.schedule.interval
        );
        const validationPayload = await validateScheduleLimit({ context, updatedInterval });
        if (validationPayload) {
          const reasonMessage = getRuleCircuitBreakerErrorMessage({
            interval: validationPayload.interval,
            intervalAvailable: validationPayload.intervalAvailable,
            action: 'bulkCreate',
            rules: enabledPersistedIds.length,
          });
          logger.warn(
            `Demoting ${enabledPersistedIds.length} rules -> disabled, schedule limit exceeded.`
          );
          for (const id of enabledPersistedIds) {
            demotedIds.set(id, { reason: 'schedule_limit_exceeded', message: reasonMessage });
          }
        }
      }

      // Phase 4B: schedule tasks for ids not already demoted by Phase 4A.
      const idsToSchedule = enabledPersistedIds.filter((id) => !demotedIds.has(id));
      if (idsToSchedule.length > 0) {
        const tasksToSchedule = idsToSchedule.map((id) =>
          buildTaskInstance(context, preparedRules.get(id)!)
        );

        let scheduledIds: string[] = [];
        let bulkScheduleThrew = false;
        try {
          const scheduledTasks = await withSpan(
            { name: 'taskManager.bulkSchedule', type: 'tasks' },
            () => context.taskManager.bulkSchedule(tasksToSchedule)
          );
          scheduledIds = scheduledTasks.map((task) => task.id);
        } catch (error) {
          // Whole-call TM throw: demote everything we tried to schedule.
          bulkScheduleThrew = true;
          logger.warn(
            `Demoting ${idsToSchedule.length} rules -> disabled, task scheduling failed.`
          );
          for (const id of idsToSchedule) {
            demotedIds.set(id, {
              reason: 'task_schedule_failed',
              message: `Failed to schedule tasks: ${error.message}`,
            });
          }
        }

        // Silent per-task drops: bulkSchedule logs+skips invalid instances.
        // Skip when the whole call threw — those ids are already accounted for
        // under `task_schedule_failed` and must not be reclassified.
        if (!bulkScheduleThrew && scheduledIds.length < idsToSchedule.length) {
          const returned = new Set(scheduledIds);
          const dropped = idsToSchedule.filter((id) => !returned.has(id));
          if (dropped.length > 0) {
            logger.warn(`Demoting ${dropped.length} rules -> disabled, task validation failed.`);
            for (const id of dropped) {
              demotedIds.set(id, {
                reason: 'task_schedule_entry_failed',
                message:
                  'Task scheduling silently dropped this rule (validation failure in task store)',
              });
            }
          }
        }

        // Phase 4C: enable scheduled tasks via taskManager.bulkEnable. 
        await bulkEnableScheduledTasks({ context, scheduledIds, demotedIds });
      }

      // Phase 4D: persist demotions (bulkUpdate SOs to disabled).
      if (demotedIds.size > 0) {
        const demotionErrors = await demotePersistedRules({
          context,
          demotedIds,
          preparedRules,
          apiKeysMap,
          keysToInvalidate,
          username,
        });
        bgErrors.push(...demotionErrors);
      }

      // Phase 4E: flush queued API key invalidations.
      await flushKeysToInvalidate(keysToInvalidate, context);
    } catch (err) {
      logger.error(`bulkCreateRules background phases failed: ${err.message}`);
    }
    return bgErrors;
  })();

  // Phase 5: domain transform + return (reflects input intent).
  const sanitizedRules: Array<SanitizedRule<Params>> = successfulSos.map((so) =>
    toSanitizedRule<Params>(context, so, context.ruleTypeRegistry)
  );

  return { rules: sanitizedRules, errors, total, backgroundWork };
}
