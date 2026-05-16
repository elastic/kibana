/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import pMap from 'p-map';
import { i18n } from '@kbn/i18n';
import { withSpan } from '@kbn/apm-utils';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkCreateObject,
} from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { TaskInstanceWithDeprecatedFields } from '@kbn/task-manager-plugin/server/task';

import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { parseDuration, getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  validateRuleTypeParams,
  getRuleNotifyWhenType,
  getDefaultMonitoringRuleDomainProperties,
} from '../../../../lib';
import { getRuleExecutionStatusPending } from '../../../../lib/rule_execution_status';
import {
  addGeneratedActionValues,
  createNewAPIKeySet,
  extractReferences,
  updateMeta,
  validateActions,
} from '../../../../rules_client/lib';
import {
  apiKeyAsAlertAttributes,
  apiKeyAsRuleDomainProperties,
} from '../../../../rules_client/common';
import { API_KEY_GENERATE_CONCURRENCY } from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { tryToEnableTasks } from '../bulk_enable/bulk_enable_rules';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule, RuleTypeRegistry, SanitizedRule } from '../../../../types';
import type { IntervalSchedule } from '../../../../../common';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleDomain, RuleParams } from '../../types';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRule,
  transformRuleDomainToRuleAttributes,
} from '../../transforms';
import { ruleDomainSchema } from '../../schemas';
import { createRuleDataSchema } from '../create/schemas';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type {
  BulkCreateOperationError,
  BulkCreateDisabledReason,
  BulkCreateRulesItem,
  BulkCreateRulesParams,
  BulkCreateRulesResult,
} from './types';

const getBulkCreateAsDisabledMessage = (message: string): string =>
  i18n.translate('xpack.alerting.rulesClient.bulkCreate.ruleCreatedDisabledErrorMessage', {
    defaultMessage: 'Rule created in a disabled state: {message}',
    values: { message },
  });

interface PreparedRule {
  id: string;
  name: string;
  enabled: boolean;
  rawRule: RawRule;
  references: SavedObjectReference[];
  schedule: IntervalSchedule;
  consumer: string;
  ruleTypeId: string;
}

interface ApiKeyEntry {
  apiKey: string | null;
  uiamApiKey: string | null;
  apiKeyCreatedByUser: boolean | null;
}

const collectNewKeysToInvalidate = (entries: Iterable<ApiKeyEntry>): string[] => {
  const keys: string[] = [];
  for (const { apiKey, uiamApiKey, apiKeyCreatedByUser } of entries) {
    if (apiKey && !apiKeyCreatedByUser) keys.push(apiKey);
    if (uiamApiKey && !apiKeyCreatedByUser) keys.push(uiamApiKey);
  }
  return keys;
};

const buildTaskInstance = (
  context: RulesClientContext,
  prepared: PreparedRule
): TaskInstanceWithDeprecatedFields => ({
  id: prepared.id,
  taskType: `alerting:${prepared.ruleTypeId}`,
  schedule: prepared.schedule,
  params: {
    alertId: prepared.id,
    spaceId: context.spaceId,
    consumer: prepared.consumer,
  },
  state: {
    previousStartedAt: null,
    alertTypeState: {},
    alertInstances: {},
  },
  scope: ['alerting'],
  // Tasks are scheduled disabled. Phase 5 enables them via taskManager.bulkEnable
  // so per-task validation drops never produce a running task without a rule SO,
  // and the activation can randomise schedule datetimes across the batch.
  enabled: false,
});

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

  // Phase 1: per-rule prepare (per-pair authorization dedupe done first).
  const authzCache = new Map<string, Promise<void>>();
  const preparedRules = new Map<string, PreparedRule>();
  const errors: BulkOperationError[] = [];
  const apiKeysMap = new Map<string, ApiKeyEntry>();
  // Key invalidation involves call to ES so we invalidate keys at the end to reduce round-trips.
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
      logger.warn(`Demoting ${enabledIds.length} rules -> disabled, schedule limit exceeded.`);
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
    // logs+skips invalid instances. Diff requested vs returned and demote the
    // missing ones — re-enabling later will hit the same validation, but at
    // least the rule definition isn't lost.
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

  // No survivors at all: still flush any pending key invalidations from
  // Phase 1 demotions (no keys to flush in that case, but keep it explicit).
  if (preparedRules.size === 0) {
    await flushKeysToInvalidate(keysToInvalidate, context);
    return { rules: [], errors, total, taskIdsFailedToBeEnabled: [] };
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
    // key (those tracked in `apiKeysMap`, plus anything previous phases queued
    // into `keysToInvalidate`), best-effort orphan-task cleanup scoped to ids we
    // actually scheduled in Phase 3, then rethrow. Inline flush — control flow
    // never reaches the end-of-function flush.
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

  // Phase 5: enable tasks for successfully persisted enabled rules.
  const taskIdsFailedToBeEnabled = await tryToEnableTasks({
    taskIdsToEnable,
    logger,
    taskManager: context.taskManager,
  });

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
    taskIdsFailedToBeEnabled, // <-- same as bulkEnableRules().
  };
}

const toSanitizedRule = <Params extends RuleParams = never>(
  context: RulesClientContext,
  so: SavedObject<RawRule>,
  ruleTypeRegistry: RuleTypeRegistry
): SanitizedRule<Params> => {
  const ruleType = ruleTypeRegistry.get(so.attributes.alertTypeId);
  const ruleDomain: RuleDomain<Params> = transformRuleAttributesToRuleDomain<Params>(
    so.attributes,
    {
      id: so.id,
      logger: context.logger,
      ruleType,
      references: so.references,
      omitGeneratedValues: false,
    },
    context.isSystemAction
  );

  try {
    ruleDomainSchema.validate(ruleDomain);
  } catch (e) {
    context.logger.warn(`Error validating bulk-created rule domain object for id: ${so.id}, ${e}`);
  }

  return transformRuleDomainToRule<Params>(ruleDomain, { isPublic: true }) as SanitizedRule<Params>;
};

interface PrepareRuleArgs<Params extends RuleParams> {
  context: RulesClientContext;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  username: string | null;
  id: string;
  rule: BulkCreateRulesItem<Params>;
  authzCache: Map<string, Promise<void>>;
  errors: BulkCreateOperationError[];
  apiKeysMap: Map<string, ApiKeyEntry>;
}

const prepareRule = async <Params extends RuleParams>({
  context,
  actionsClient,
  username,
  id,
  rule,
  authzCache,
  errors,
  apiKeysMap,
}: PrepareRuleArgs<Params>): Promise<{ prepared?: PreparedRule; error?: BulkOperationError }> => {
  const { allowMissingConnectorSecrets } = rule;

  try {
    const { actions: genActions, systemActions: genSystemActions } = await addGeneratedActionValues(
      rule.data.actions,
      rule.data.systemActions,
      context
    );
    const data = { ...rule.data, actions: genActions, systemActions: genSystemActions };

    try {
      createRuleDataSchema.validate(data);
    } catch (validationError) {
      throw Boom.badRequest(`Error validating create data - ${validationError.message}`);
    }

    // ruleTypeRegistry.get throws 400 if not registered.
    context.ruleTypeRegistry.get(data.alertTypeId);

    const authzKey = `${data.alertTypeId}::${data.consumer}`;
    if (!authzCache.has(authzKey)) {
      authzCache.set(
        authzKey,
        context.authorization.ensureAuthorized({
          ruleTypeId: data.alertTypeId,
          consumer: data.consumer,
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      );
    }
    try {
      await authzCache.get(authzKey)!;
    } catch (authzError) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.CREATE,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: data.name },
          error: authzError,
        })
      );
      throw authzError;
    }

    context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);
    const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
    const validatedRuleTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);

    await validateActions(context, ruleType, data, allowMissingConnectorSecrets);
    await validateAndAuthorizeSystemActions({
      actionsClient,
      actionsAuthorization: context.actionsAuthorization,
      connectorAdapterRegistry: context.connectorAdapterRegistry,
      systemActions: data.systemActions ?? [],
      rule: { consumer: data.consumer, producer: ruleType.producer },
    });

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

    // Mint API key for enabled rules.
    // Soft-fail: a key-mint failure does NOT reject the rule. We persist it as
    // disabled, push a degraded error so the caller knows, and let downstream
    // phases treat it as a never-enabled rule. Re-enabling later will re-mint.
    let effectiveEnabled = data.enabled;
    let apiKeyProps:
      | ReturnType<typeof apiKeyAsRuleDomainProperties>
      | Awaited<ReturnType<typeof createNewAPIKeySet>> = apiKeyAsRuleDomainProperties(
      null,
      username,
      false
    );
    if (data.enabled) {
      try {
        apiKeyProps = await createNewAPIKeySet(context, {
          id: ruleType.id,
          ruleName: data.name,
          username,
          shouldUpdateApiKey: true,
          errorMessage: 'Error creating rule: could not create API key',
        });
        apiKeysMap.set(id, {
          apiKey: apiKeyProps.apiKey ?? null,
          uiamApiKey: apiKeyProps.uiamApiKey ?? null,
          apiKeyCreatedByUser: apiKeyProps.apiKeyCreatedByUser ?? null,
        });
      } catch (apiKeyErr) {
        effectiveEnabled = false;
        apiKeyProps = apiKeyAsRuleDomainProperties(null, username, false);
        errors.push({
          message: getBulkCreateAsDisabledMessage(apiKeyErr.message),
          status: apiKeyErr.output?.statusCode,
          rule: { id, name: data.name },
          disabledReason: 'api_key_creation_failed',
        });
      }
    }

    const allActions = [...data.actions, ...(data.systemActions ?? [])];
    const artifacts = data.artifacts ?? {};
    const {
      references,
      params: updatedParams,
      actions: actionsWithRefs,
      artifacts: artifactsWithRefs,
    } = await extractReferences(context, ruleType, allActions, validatedRuleTypeParams, artifacts);

    const createTime = Date.now();
    const lastRunTimestamp = new Date();
    const legacyId = Semver.lt(context.kibanaVersion, '8.0.0') ? id : null;
    const notifyWhen = getRuleNotifyWhenType(data.notifyWhen ?? null, data.throttle ?? null);
    const throttle = data.throttle ?? null;
    const { systemActions: _sa, actions: _a, ...restData } = data;

    const ruleAttributes = transformRuleDomainToRuleAttributes({
      actionsWithRefs,
      artifactsWithRefs,
      rule: {
        ...restData,
        ...apiKeyProps,
        enabled: effectiveEnabled,
        id,
        createdBy: username,
        updatedBy: username,
        createdAt: new Date(createTime),
        updatedAt: new Date(createTime),
        snoozeSchedule: [],
        muteAll: false,
        mutedInstanceIds: [],
        notifyWhen,
        throttle,
        executionStatus: getRuleExecutionStatusPending(lastRunTimestamp.toISOString()),
        monitoring: getDefaultMonitoringRuleDomainProperties(lastRunTimestamp.toISOString()),
        revision: 0,
        running: false,
      } as unknown as RuleDomain<Params>,
      params: { legacyId, paramsWithRefs: updatedParams },
    });

    if (effectiveEnabled) {
      ruleAttributes.lastEnabledAt = new Date(createTime).toISOString();
      ruleAttributes.scheduledTaskId = id;
    }

    const prepared = {
      id,
      name: data.name,
      enabled: effectiveEnabled,
      rawRule: ruleAttributes,
      references,
      schedule: data.schedule,
      consumer: data.consumer,
      ruleTypeId: data.alertTypeId,
    };
    return { prepared };
  } catch (err) {
    const error = {
      message: err.message,
      status: err.output?.statusCode,
      rule: { id, name: rule.data?.name ?? 'n/a' },
    };
    return { error };
  }
};

/**
 * Demote in-memory (enabled -> disabled): flips a set of currently-enabled
 * prepared rules to disabled, queues their API keys for invalidation, records a degraded
 * error so the caller can surface "rule was created in a disabled state".
 */
const demotePreparedRules = ({
  ids,
  reason,
  message,
  preparedRules,
  apiKeysMap,
  keysToInvalidate,
  errors,
  username,
}: {
  ids: string[];
  reason: BulkCreateDisabledReason;
  message: string;
  preparedRules: Map<string, PreparedRule>;
  apiKeysMap: Map<string, ApiKeyEntry>;
  keysToInvalidate: Set<string>;
  errors: BulkCreateOperationError[];
  username: string | null;
}): void => {
  for (const id of ids) {
    const prepared = preparedRules.get(id);
    if (!prepared || !prepared.enabled) continue;

    const apiKey = apiKeysMap.get(id);
    if (apiKey) {
      for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
      apiKeysMap.delete(id);
    }

    // Re-shape `rawRule` to the disabled-rule form.
    const nullKey = apiKeyAsAlertAttributes(null, username, false);
    prepared.rawRule = {
      ...prepared.rawRule,
      ...nullKey,
      uiamApiKey: null,
      enabled: false,
    };
    delete prepared.rawRule.scheduledTaskId;
    delete prepared.rawRule.lastEnabledAt;
    prepared.enabled = false;

    errors.push({
      message: getBulkCreateAsDisabledMessage(message),
      rule: { id, name: prepared.name },
      disabledReason: reason,
    });
  }
};

const flushKeysToInvalidate = async (
  keysToInvalidate: Set<string>,
  context: RulesClientContext
): Promise<void> => {
  if (keysToInvalidate.size === 0) return;
  await bulkMarkApiKeysForInvalidation(
    { apiKeys: [...keysToInvalidate] },
    context.logger,
    context.unsecuredSavedObjectsClient
  );
  keysToInvalidate.clear();
};
