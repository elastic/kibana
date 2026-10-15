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
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { RuleChangeTrackingAction, type RuleChangeTracking } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  API_KEY_GENERATE_CONCURRENCY,
  DEFAULT_BULK_UPDATE_BATCH_SIZE,
  MIN_BULK_UPDATE_BATCH_SIZE,
  MAX_BULK_UPDATE_BATCH_SIZE,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
} from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  RetryForConflictsAttempts,
  RetryForConflictsDelay,
} from '../../../../lib/retry_if_conflicts';
import { bulkCreateRulesSo } from '../../../../data/rule';
import { bulkMigrateLegacyActions } from '../../../../rules_client/lib';
import type { RawRule } from '../../../../types';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import { validateScheduleLimit } from '../get_schedule_frequency';
import { invalidateKeys, type ApiKeyEntry } from '../common_utils/invalidate_keys';
import { logRuleChanges } from '../common_utils/log_rule_changes';
import type {
  BatchResult,
  BulkUpdateRulesItem,
  BulkUpdateRulesParams,
  BulkUpdateRulesResult,
  Pending,
  PreparedUpdate,
} from './types';
import { loadPending, prepareUpdate, updateTaskSchedules } from './utils';

export async function bulkUpdateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkUpdateRulesParams<Params>
): Promise<BulkUpdateRulesResult> {
  const { rules, exitEarlyOnError = false, changeTracking, allowMissingConnectorSecrets } = params;
  const { logger } = context;
  const total = rules.length;

  if (total === 0) {
    return { successfulIds: [], errors: [], total: 0 };
  }

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `bulkUpdateRules: ${total} rules exceeds the hard limit of ${MAX_RULES_NUMBER_FOR_BULK_OPERATION}. ` +
        `Callers should enforce request-level limits before invoking this method.`
    );
  }

  const batchSize = params.batchSize ?? DEFAULT_BULK_UPDATE_BATCH_SIZE;

  if (Number.isNaN(batchSize) || batchSize < MIN_BULK_UPDATE_BATCH_SIZE) {
    throw Boom.badRequest(
      `bulkUpdateRules: batchSize ${batchSize} is below the minimum of ${MIN_BULK_UPDATE_BATCH_SIZE}.`
    );
  }
  if (batchSize > MAX_BULK_UPDATE_BATCH_SIZE) {
    throw Boom.badRequest(
      `bulkUpdateRules: batchSize ${batchSize} exceeds the maximum of ${MAX_BULK_UPDATE_BATCH_SIZE}.`
    );
  }

  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();
  const successfulIds: string[] = [];
  const errors: BulkOperationError[] = [];

  const totalBatches = Math.ceil(total / batchSize);
  logger.debug(`bulkUpdateRules: ${total} input(s), ${totalBatches}x batches of ${batchSize}.`);

  const remaining = [...rules];
  while (remaining.length > 0) {
    const batch = remaining.splice(0, batchSize);

    const result = await runBatch<Params>({
      context,
      username,
      actionsClient,
      batch,
      changeTracking,
      allowMissingConnectorSecrets,
      strict: exitEarlyOnError,
    });

    successfulIds.push(...result.successfulIds);
    errors.push(...result.errors);

    if (result.circuitBreaker) {
      errors.push(...remaining.map(result.circuitBreaker));
      break;
    }

    if (exitEarlyOnError && result.errors.length > 0) {
      logger.debug(`bulkUpdateRules: exiting early, ${remaining.length} rules skipped.`);
      break;
    }
  }

  return { successfulIds, errors, total };
}

interface RunBatchArgs<Params extends RuleParams> {
  context: RulesClientContext;
  username: string | null;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  batch: Array<BulkUpdateRulesItem<Params>>;
  changeTracking?: RuleChangeTracking;
  allowMissingConnectorSecrets?: boolean;
  strict?: boolean;
}

async function runBatch<Params extends RuleParams>({
  context,
  username,
  actionsClient,
  batch,
  changeTracking,
  allowMissingConnectorSecrets,
  strict = false,
}: RunBatchArgs<Params>): Promise<BatchResult<Params>> {
  const errors: BulkOperationError[] = [];
  const byId = new Map(batch.map((item) => [item.id, item]));
  const ids = [...byId.keys()];

  const toPrepare = await loadPending(context, byId, ids, errors);

  if (strict && errors.length > 0) {
    return { successfulIds: [], errors };
  }
  if (toPrepare.length === 0) {
    return { successfulIds: [], errors };
  }

  const authPairs = new Map<string, Set<string>>();
  for (const { original } of toPrepare) {
    const { alertTypeId, consumer } = original.attributes;
    const consumers = authPairs.get(alertTypeId) ?? new Set<string>();
    consumers.add(consumer);
    authPairs.set(alertTypeId, consumers);
  }

  await withSpan(
    { name: 'bulkUpdateRules.runBatch.bulkEnsureAuthorized', type: 'rules' },
    async () => {
      try {
        await context.authorization.bulkEnsureAuthorized({
          ruleTypeIdConsumersPairs: [...authPairs.entries()].map(([ruleTypeId, consumers]) => ({
            ruleTypeId,
            consumers: [...consumers],
          })),
          operation: WriteOperations.Update,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (authzError) {
        context.auditLogger?.log(
          ruleAuditEvent({ action: RuleAuditAction.BULK_UPDATE, error: authzError })
        );
        throw authzError;
      }
    }
  );

  const prevInterval: string[] = [];
  const updatedInterval: string[] = [];
  for (const { item, original } of toPrepare) {
    const { enabled, schedule } = original.attributes;
    if (enabled && schedule?.interval && schedule.interval !== item.data.schedule.interval) {
      prevInterval.push(schedule.interval);
      updatedInterval.push(item.data.schedule.interval);
    }
  }

  if (updatedInterval.length > 0) {
    const overflow = await withSpan(
      { name: 'bulkUpdateRules.runBatch.validateScheduleLimit', type: 'rules' },
      () => validateScheduleLimit({ context, prevInterval, updatedInterval })
    );
    if (overflow) {
      const message = getRuleCircuitBreakerErrorMessage({
        interval: overflow.interval,
        intervalAvailable: overflow.intervalAvailable,
        action: 'bulkUpdate',
        rules: updatedInterval.length,
      });
      const circuitBreaker = (item: BulkUpdateRulesItem<Params>): BulkOperationError => ({
        message,
        status: 400,
        rule: { id: item.id, name: item.data.name ?? 'n/a' },
      });
      const scheduleLimitErrors = toPrepare.map(({ item }) => circuitBreaker(item));
      return {
        successfulIds: [],
        errors: [...errors, ...scheduleLimitErrors],
        circuitBreaker,
      };
    }
  }

  try {
    await withSpan(
      { name: 'bulkUpdateRules.runBatch.bulkMigrateLegacyActions', type: 'rules' },
      () =>
        bulkMigrateLegacyActions({
          context,
          rules: toPrepare.map(({ original }) => original),
        })
    );
  } catch (error) {
    context.logger.error(
      `bulkUpdateRules: legacy actions migration failed, continuing: ${error.message}`
    );
  }

  const written = await writeWithRetry({
    context,
    username,
    actionsClient,
    byId,
    pending: toPrepare,
    changeTracking,
    allowMissingConnectorSecrets,
    strict,
  });

  return { successfulIds: written.successfulIds, errors: [...errors, ...written.errors] };
}

interface WriteWithRetryArgs<Params extends RuleParams> {
  context: RulesClientContext;
  username: string | null;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  byId: Map<string, BulkUpdateRulesItem<Params>>;
  pending: Array<Pending<Params>>;
  changeTracking?: RuleChangeTracking;
  allowMissingConnectorSecrets?: boolean;
  strict: boolean;
}

// Most 409s are executor lastRun/executionStatus writes, not a competing PUT. Reload and apply the same payload.
async function writeWithRetry<Params extends RuleParams>({
  context,
  username,
  actionsClient,
  byId,
  pending,
  changeTracking,
  allowMissingConnectorSecrets,
  strict,
}: WriteWithRetryArgs<Params>): Promise<BatchResult<Params>> {
  const { logger } = context;
  const successfulIds: string[] = [];
  const errors: BulkOperationError[] = [];
  let remaining = pending;
  let retries = RetryForConflictsAttempts;
  let first = true;

  while (remaining.length > 0) {
    const attempt = await putAttempt({
      context,
      username,
      actionsClient,
      pending: remaining,
      changeTracking,
      allowMissingConnectorSecrets,
      abortOnPrepareError: strict && first,
      audit: first,
    });
    first = false;

    successfulIds.push(...attempt.successfulIds);
    errors.push(...attempt.errors);

    if (attempt.aborted || attempt.conflicts.length === 0) {
      break;
    }

    if (retries <= 0) {
      logger.warn(
        `bulkUpdateRules conflict, exceeded retries (${attempt.conflicts.length} rule(s))`
      );
      errors.push(...attempt.conflictErrors);
      break;
    }

    logger.debug(`bulkUpdateRules conflict, retrying ${attempt.conflicts.length} rule(s) ...`);
    await new Promise((resolve) => setTimeout(resolve, RetryForConflictsDelay));
    retries -= 1;
    remaining = await loadPending(context, byId, attempt.conflicts, errors);
  }

  return { successfulIds, errors };
}

interface PutAttemptArgs<Params extends RuleParams> {
  context: RulesClientContext;
  username: string | null;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  pending: Array<Pending<Params>>;
  changeTracking?: RuleChangeTracking;
  allowMissingConnectorSecrets?: boolean;
  abortOnPrepareError: boolean;
  audit: boolean;
}

interface PutAttemptResult {
  successfulIds: string[];
  errors: BulkOperationError[];
  conflicts: string[];
  conflictErrors: BulkOperationError[];
  aborted: boolean;
}

async function putAttempt<Params extends RuleParams>({
  context,
  username,
  actionsClient,
  pending,
  changeTracking,
  allowMissingConnectorSecrets,
  abortOnPrepareError,
  audit,
}: PutAttemptArgs<Params>): Promise<PutAttemptResult> {
  const preparedRules = new Map<string, PreparedUpdate>();
  const apiKeys = new Map<string, ApiKeyEntry>();
  const invalidKeys: ApiKeyEntry[] = [];
  const errors: BulkOperationError[] = [];

  await withSpan(
    {
      name: 'bulkUpdateRules.putAttempt.pMap.prepareUpdate',
      type: 'rules',
      labels: { count: String(pending.length) },
    },
    () =>
      pMap(
        pending,
        async ({ item, original }) => {
          const { prepared, error } = await prepareUpdate({
            context,
            actionsClient,
            username,
            item,
            original,
            allowMissingConnectorSecrets,
            apiKeys,
            invalidKeys,
          });
          if (prepared) preparedRules.set(item.id, prepared);
          else if (error) errors.push(error);
        },
        { concurrency: API_KEY_GENERATE_CONCURRENCY }
      )
  );

  await withSpan(
    {
      name: 'bulkUpdateRules.putAttempt.invalidateKeys',
      type: 'rules',
      labels: { count: String(invalidKeys.length) },
    },
    () => invalidateKeys(invalidKeys.splice(0), context)
  );

  if (abortOnPrepareError && errors.length > 0) {
    await withSpan({ name: 'bulkUpdateRules.putAttempt.invalidateKeys', type: 'rules' }, () =>
      invalidateKeys(apiKeys.values(), context)
    );
    return { successfulIds: [], errors, conflicts: [], conflictErrors: [], aborted: true };
  }
  if (preparedRules.size === 0) {
    return { successfulIds: [], errors, conflicts: [], conflictErrors: [], aborted: false };
  }

  if (audit) {
    for (const prepared of preparedRules.values()) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.BULK_UPDATE,
          outcome: 'unknown',
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: prepared.id, name: prepared.name },
        })
      );
    }
  }

  const bulkObjects: Array<SavedObjectsBulkCreateObject<RawRule>> = [...preparedRules.values()].map(
    (prepared) => ({
      type: RULE_SAVED_OBJECT_TYPE,
      id: prepared.id,
      version: prepared.version,
      attributes: prepared.rawRule,
      references: prepared.references,
    })
  );

  let bulkResponse;
  try {
    bulkResponse = await withSpan(
      {
        name: 'bulkUpdateRules.putAttempt.bulkCreateRulesSo',
        type: 'rules',
        labels: { count: String(bulkObjects.length) },
      },
      () =>
        bulkCreateRulesSo({
          savedObjectsClient: context.unsecuredSavedObjectsClient,
          bulkCreateRuleAttributes: bulkObjects,
          savedObjectsBulkCreateOptions: { overwrite: true },
        })
    );
  } catch (error) {
    await withSpan(
      {
        name: 'bulkUpdateRules.putAttempt.invalidateKeys',
        type: 'rules',
        labels: { count: String(apiKeys.size) },
      },
      () => invalidateKeys(apiKeys.values(), context)
    );
    const message = `Failed to bulk update rule saved objects: ${error.message}`;
    const status = error.output?.statusCode;
    for (const { id, name } of preparedRules.values()) {
      errors.push({ message, status, rule: { id, name } });
    }
    return { successfulIds: [], errors, conflicts: [], conflictErrors: [], aborted: false };
  }

  const successfulIds: string[] = [];
  const successfulSavedObjects: Array<SavedObject<RawRule>> = [];
  const successfulPrepared: PreparedUpdate[] = [];
  const conflicts: string[] = [];
  const conflictErrors: BulkOperationError[] = [];

  for (const so of bulkResponse.saved_objects) {
    const prepared = preparedRules.get(so.id);
    if (isSavedObjectErrorResult(so)) {
      const apiKey = apiKeys.get(so.id);
      if (apiKey) {
        invalidKeys.push(apiKey);
        apiKeys.delete(so.id);
      }
      const err: BulkOperationError = {
        message: so.error.message ?? 'Error saving rule SO',
        status: so.error.statusCode,
        rule: { id: so.id, name: prepared?.name ?? 'n/a' },
      };
      if (so.error.statusCode === 409) {
        conflicts.push(so.id);
        conflictErrors.push(err);
      } else {
        errors.push(err);
      }
    } else {
      successfulIds.push(so.id);
      successfulSavedObjects.push(so);
      if (prepared) {
        successfulPrepared.push(prepared);
        if (prepared.oldKeys.apiKey || prepared.oldKeys.uiamApiKey) {
          invalidKeys.push(prepared.oldKeys);
        }
      }
    }
  }

  await withSpan(
    {
      name: 'bulkUpdateRules.putAttempt.invalidateKeys',
      type: 'rules',
      labels: { count: String(invalidKeys.length) },
    },
    () => invalidateKeys(invalidKeys.splice(0), context)
  );
  await withSpan(
    {
      name: 'bulkUpdateRules.putAttempt.updateTaskSchedules',
      type: 'rules',
      labels: { count: String(successfulPrepared.length) },
    },
    () => updateTaskSchedules(context, successfulPrepared)
  );

  if (successfulSavedObjects.length > 0) {
    await withSpan({ name: 'bulkUpdateRules.putAttempt.logRuleChanges', type: 'rules' }, () =>
      logRuleChanges({
        ruleSOs: successfulSavedObjects,
        encryptedFieldsMap: new Map(
          [...apiKeys.entries()].map(([ruleId, { apiKey, uiamApiKey }]) => [
            ruleId,
            { apiKey, uiamApiKey },
          ])
        ),
        rulesClientContext: context,
        changesContext: {
          action: changeTracking?.action ?? RuleChangeTrackingAction.ruleUpdate,
          metadata: changeTracking?.metadata,
        },
      })
    );
  }

  return {
    successfulIds,
    errors,
    conflicts,
    conflictErrors,
    aborted: false,
  };
}
