/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import pMap from 'p-map';
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
import { apiKeyAsRuleDomainProperties } from '../../../../rules_client/common';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { tryToEnableTasks } from '../bulk_enable/bulk_enable_rules';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { RawRule, RuleTypeRegistry, SanitizedRule } from '../../../../types';
import type { IntervalSchedule } from '../../../../../common';
import type { RulesClientContext, BulkOperationError } from '../../../../rules_client/types';
import type { RuleDomain, RuleParams } from '../../types';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRule,
  transformRuleDomainToRuleAttributes,
} from '../../transforms';
import { ruleDomainSchema } from '../../schemas';
import { createRuleDataSchema } from '../create/schemas';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type { BulkCreateRulesItem, BulkCreateRulesParams, BulkCreateRulesResult } from './types';

/**
 * Bound the per-rule prepare phase to avoid overwhelming downstream services
 * (security plugin API key minting, action validation).
 */
const PREPARE_CONCURRENCY = 10;

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
  const { rules: inputs } = params;
  const total = inputs.length;

  if (total === 0) {
    return { rules: [], errors: [], total: 0, taskIdsFailedToBeEnabled: [] };
  }

  const errors: BulkOperationError[] = [];
  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();

  // Phase 0: assign ids up-front, partition by enabled flag (tracked per item id below).
  const inputsWithIds = inputs.map((input) => ({
    id: input.options?.id ?? SavedObjectsUtils.generateId(),
    input,
  }));

  // Phase 1: per-rule prepare (per-pair authorization dedupe done first).
  const authzCache = new Map<string, Promise<void>>();
  const preparedRules = new Map<string, PreparedRule>();
  const apiKeysMap = new Map<string, ApiKeyEntry>();

  await pMap(
    inputsWithIds,
    async ({ id, input }) => {
      const prepared = await prepareRule({
        context,
        actionsClient,
        username,
        id,
        input,
        authzCache,
        errors,
        apiKeysMap,
      });
      if (prepared) preparedRules.set(id, prepared);
    },
    { concurrency: PREPARE_CONCURRENCY }
  );

  // Phase 2: schedule-limit gate, scoped to the enabled subset only.
  const enabledIds = [...preparedRules.values()].filter((p) => p.enabled).map((p) => p.id);

  if (enabledIds.length > 0) {
    const updatedInterval = enabledIds.map((id) => preparedRules.get(id)!.schedule.interval);
    const validationPayload = await validateScheduleLimit({ context, updatedInterval });
    if (validationPayload) {
      const message = getRuleCircuitBreakerErrorMessage({
        interval: validationPayload.interval,
        intervalAvailable: validationPayload.intervalAvailable,
        action: 'bulkCreate',
        rules: enabledIds.length,
      });
      await dropEnabledSubset({
        context,
        enabledIds,
        preparedRules,
        apiKeysMap,
        errors,
        message,
      });
    }
  }

  // Phase 3: schedule tasks for the surviving enabled subset.
  const survivingEnabledIds = [...preparedRules.values()].filter((p) => p.enabled).map((p) => p.id);
  const scheduledTaskIdsThisCall = new Set<string>();

  if (survivingEnabledIds.length > 0) {
    const tasksToSchedule = survivingEnabledIds.map((id) =>
      buildTaskInstance(context, preparedRules.get(id)!)
    );

    let scheduledIds: string[] = [];
    try {
      const scheduledTasks = await withSpan(
        { name: 'taskManager.bulkSchedule', type: 'tasks' },
        () => context.taskManager.bulkSchedule(tasksToSchedule)
      );
      scheduledIds = scheduledTasks.map((task) => task.id);
    } catch (error) {
      // Whole-call TM throw: fail enabled subset only, continue with disabled subset.
      await dropEnabledSubset({
        context,
        enabledIds: survivingEnabledIds,
        preparedRules,
        apiKeysMap,
        errors,
        message: `Failed to schedule tasks: ${error.message}`,
      });
    }

    if (scheduledIds.length > 0) {
      scheduledIds.forEach((id) => scheduledTaskIdsThisCall.add(id));
    }

    // Silent per-task drops: bulkSchedule's `taskInstanceToAttributes` validation
    // logs+skips invalid instances. Diff requested vs returned and surface them as
    // per-rule errors so we don't write a rule SO whose scheduledTaskId is dangling.
    if (preparedRules.size > 0 && scheduledIds.length < survivingEnabledIds.length) {
      const returned = new Set(scheduledIds);
      const dropped = survivingEnabledIds.filter((id) => !returned.has(id));
      if (dropped.length > 0) {
        await dropEnabledSubset({
          context,
          enabledIds: dropped,
          preparedRules,
          apiKeysMap,
          errors,
          message: 'Task scheduling silently dropped this rule (validation failure in task store)',
        });
      }
    }
  }

  // No survivors at all: short-circuit before SO write.
  if (preparedRules.size === 0) {
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

  // Phase 4: bulk SO create (no overwrite — id collisions surface as per-row 409).
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
    // Whole-call SO throw: invalidate every newly-minted key, best-effort orphan-task
    // cleanup scoped to ids we actually scheduled in Phase 3, then rethrow.
    const keysToInvalidate = collectNewKeysToInvalidate(apiKeysMap.values());
    if (keysToInvalidate.length > 0) {
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: keysToInvalidate },
        context.logger,
        context.unsecuredSavedObjectsClient
      );
    }
    if (scheduledTaskIdsThisCall.size > 0) {
      try {
        await context.taskManager.bulkRemove([...scheduledTaskIdsThisCall]);
      } catch (cleanupError) {
        context.logger.error(
          `bulkCreateRules: failed to clean up tasks ${[...scheduledTaskIdsThisCall].join(
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

  for (const so of bulkResponse.saved_objects) {
    if (so.error) {
      errors.push({
        message: so.error.message ?? 'n/a',
        status: so.error.statusCode,
        rule: { id: so.id, name: preparedRules.get(so.id)?.name ?? 'n/a' },
      });

      // Per-row API key invalidation (only the failed rule's key).
      const apiKey = apiKeysMap.get(so.id);
      if (apiKey) {
        const keys = collectNewKeysToInvalidate([apiKey]);
        if (keys.length > 0) {
          await bulkMarkApiKeysForInvalidation(
            { apiKeys: keys },
            context.logger,
            context.unsecuredSavedObjectsClient
          );
        }
      }

      // Best-effort orphan-task cleanup, but ONLY if this id was scheduled by us
      // in Phase 3. Avoids nuking a pre-existing rule's task on a 409 caused by a
      // caller-supplied id collision.
      if (scheduledTaskIdsThisCall.has(so.id)) {
        try {
          await context.taskManager.removeIfExists(so.id);
        } catch (cleanupError) {
          context.logger.error(
            `bulkCreateRules: failed to clean up task ${so.id} after SO per-row error: ${cleanupError.message}`
          );
        }
      }
      continue;
    }

    successfulSos.push(so as SavedObject<RawRule>);
    if (scheduledTaskIdsThisCall.has(so.id)) {
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

  // Phase 5: enable tasks for successfully persisted enabled rules.
  const taskIdsFailedToBeEnabled = await tryToEnableTasks({
    taskIdsToEnable,
    logger: context.logger,
    taskManager: context.taskManager,
  });

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
  input: BulkCreateRulesItem<Params>;
  authzCache: Map<string, Promise<void>>;
  errors: BulkOperationError[];
  apiKeysMap: Map<string, ApiKeyEntry>;
}

const prepareRule = async <Params extends RuleParams>({
  context,
  actionsClient,
  username,
  id,
  input,
  authzCache,
  errors,
  apiKeysMap,
}: PrepareRuleArgs<Params>): Promise<PreparedRule | null> => {
  const { allowMissingConnectorSecrets } = input;

  try {
    const { actions: genActions, systemActions: genSystemActions } = await addGeneratedActionValues(
      input.data.actions,
      input.data.systemActions,
      context
    );
    const data = { ...input.data, actions: genActions, systemActions: genSystemActions };

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

    // Mint API key for enabled rules. createNewAPIKeySet returns the encoded
    // `{ apiKey, apiKeyOwner, apiKeyCreatedByUser, uiamApiKey? }` shape suitable
    // for direct use as rule attributes; for disabled rules we mirror createRule
    // and use apiKeyAsRuleDomainProperties(null, ...) (all-null props).
    const apiKeyProps = data.enabled
      ? await createNewAPIKeySet(context, {
          id: ruleType.id,
          ruleName: data.name,
          username,
          shouldUpdateApiKey: true,
          errorMessage: 'Error creating rule: could not create API key',
        })
      : apiKeyAsRuleDomainProperties(null, username, false);

    if (data.enabled) {
      apiKeysMap.set(id, {
        apiKey: apiKeyProps.apiKey ?? null,
        uiamApiKey: apiKeyProps.uiamApiKey ?? null,
        apiKeyCreatedByUser: apiKeyProps.apiKeyCreatedByUser ?? null,
      });
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

    if (data.enabled) {
      ruleAttributes.lastEnabledAt = new Date(createTime).toISOString();
      ruleAttributes.scheduledTaskId = id;
    }

    return {
      id,
      name: data.name,
      enabled: data.enabled,
      rawRule: ruleAttributes,
      references,
      schedule: data.schedule,
      consumer: data.consumer,
      ruleTypeId: data.alertTypeId,
    };
  } catch (error) {
    errors.push({
      message: error.message,
      status: error.output?.statusCode,
      rule: { id, name: input.data?.name ?? 'n/a' },
    });
    return null;
  }
};

const dropEnabledSubset = async ({
  context,
  enabledIds,
  preparedRules,
  apiKeysMap,
  errors,
  message,
}: {
  context: RulesClientContext;
  enabledIds: string[];
  preparedRules: Map<string, PreparedRule>;
  apiKeysMap: Map<string, ApiKeyEntry>;
  errors: BulkOperationError[];
  message: string;
}) => {
  const keysToInvalidate: string[] = [];
  for (const id of enabledIds) {
    const prepared = preparedRules.get(id);
    if (!prepared) continue;
    errors.push({ message, rule: { id, name: prepared.name } });
    const apiKey = apiKeysMap.get(id);
    if (apiKey) {
      keysToInvalidate.push(...collectNewKeysToInvalidate([apiKey]));
      apiKeysMap.delete(id);
    }
    preparedRules.delete(id);
  }
  if (keysToInvalidate.length > 0) {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: keysToInvalidate },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }
};
