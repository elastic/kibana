/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import { i18n } from '@kbn/i18n';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import type { TaskInstanceWithDeprecatedFields } from '@kbn/task-manager-plugin/server/task';

import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { parseDuration } from '../../../../../common';
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
  validateActions,
} from '../../../../rules_client/lib';
import {
  apiKeyAsAlertAttributes,
  apiKeyAsRuleDomainProperties,
} from '../../../../rules_client/common';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { bulkUpdateRuleSo } from '../../../../data/rule';
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
import type {
  BulkCreateDisabledReason,
  BulkCreateOperationError,
  BulkCreateRulesItem,
} from './types';

export interface PreparedRule {
  id: string;
  name: string;
  enabled: boolean;
  rawRule: RawRule;
  references: SavedObjectReference[];
  schedule: IntervalSchedule;
  consumer: string;
  ruleTypeId: string;
}

export interface ApiKeyEntry {
  apiKey: string | null;
  uiamApiKey: string | null;
  apiKeyCreatedByUser: boolean | null;
}

export interface DemotionEntry {
  reason: BulkCreateDisabledReason;
  message: string;
}

export const getBulkCreateAsDisabledMessage = (message: string): string =>
  i18n.translate('xpack.alerting.rulesClient.bulkCreate.ruleCreatedDisabledErrorMessage', {
    defaultMessage: 'Rule created in a disabled state: {message}',
    values: { message },
  });

export const collectNewKeysToInvalidate = (entries: Iterable<ApiKeyEntry>): string[] => {
  const keys: string[] = [];
  for (const { apiKey, uiamApiKey, apiKeyCreatedByUser } of entries) {
    if (apiKey && !apiKeyCreatedByUser) keys.push(apiKey);
    if (uiamApiKey && !apiKeyCreatedByUser) keys.push(uiamApiKey);
  }
  return keys;
};

export const buildTaskInstance = (
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
  // Created disabled (and enable later) to avoid stampede
  // @see https://github.com/elastic/kibana/pull/174656
  enabled: false,
});

export const toSanitizedRule = <Params extends RuleParams = never>(
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

export const prepareRule = async <Params extends RuleParams>({
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

    const prepared: PreparedRule = {
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
 * Enables freshly-scheduled tasks via `taskManager.bulkEnable`.
 * Mutates `demotedIds` in place; never re-throws.
 */
export const bulkEnableScheduledTasks = async ({
  context,
  scheduledIds,
  demotedIds,
}: {
  context: RulesClientContext;
  scheduledIds: string[];
  demotedIds: Map<string, DemotionEntry>;
}): Promise<void> => {
  if (scheduledIds.length === 0) return;

  try {
    const enableResult = await withSpan({ name: 'taskManager.bulkEnable', type: 'tasks' }, () =>
      context.taskManager.bulkEnable(scheduledIds)
    );
    const failedIds = enableResult?.errors?.map((e) => e.id) ?? [];
    if (failedIds.length === 0) return;

    context.logger.warn(`Demoting ${failedIds.length} rules -> disabled, task enable failed.`);
    for (const id of failedIds) {
      demotedIds.set(id, {
        reason: 'task_enable_failed',
        message: 'Failed to enable scheduled task',
      });
    }
  } catch (error) {
    context.logger.warn(
      `Demoting ${scheduledIds.length} rules -> disabled, taskManager.bulkEnable threw.`
    );
    for (const id of scheduledIds) {
      demotedIds.set(id, {
        reason: 'task_enable_failed',
        message: `Failed to enable scheduled tasks: ${error.message}`,
      });
    }
  }
};

/**
 * Persists demotions for the background path of `bulkCreateRules`:
 * bulkUpdate the SOs to disabled, queue minted keys for invalidation,
 * emit DISABLE audits. Returns one structured error per demoted rule
 * for surfacing via `result.backgroundWork`. Failures are logged —
 * never re-thrown.
 */
export const demotePersistedRules = async ({
  context,
  demotedIds,
  preparedRules,
  apiKeysMap,
  keysToInvalidate,
  username,
}: {
  context: RulesClientContext;
  demotedIds: Map<string, DemotionEntry>;
  preparedRules: Map<string, PreparedRule>;
  apiKeysMap: Map<string, ApiKeyEntry>;
  keysToInvalidate: Set<string>;
  username: string | null;
}): Promise<BulkCreateOperationError[]> => {
  const errors: BulkCreateOperationError[] = [];
  if (demotedIds.size === 0) return errors;

  const nullKey = apiKeyAsAlertAttributes(null, username, false);
  const rulesToUpdate: Array<{ id: string; attributes: Partial<RawRule> }> = [];

  for (const [id, { reason, message }] of demotedIds) {
    const prepared = preparedRules.get(id);
    if (!prepared) continue;

    const apiKey = apiKeysMap.get(id);
    if (apiKey) {
      for (const k of collectNewKeysToInvalidate([apiKey])) keysToInvalidate.add(k);
      apiKeysMap.delete(id);
    }

    // `null` clears `scheduledTaskId`/`lastEnabledAt` in ES; the RawRule type
    // models them as `string | undefined`, so cast through `unknown`.
    const cleared = {
      ...nullKey,
      enabled: false,
      scheduledTaskId: null,
      lastEnabledAt: null,
    } as unknown as Partial<RawRule>;

    rulesToUpdate.push({ id, attributes: cleared });

    errors.push({
      message: getBulkCreateAsDisabledMessage(message),
      rule: { id, name: prepared.name },
      disabledReason: reason,
    });

    context.logger.warn(
      `bulkCreateRules: ${getBulkCreateAsDisabledMessage(message)} (id=${id}, reason=${reason})`
    );

    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DISABLE,
        outcome: 'unknown',
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: prepared.name },
      })
    );
  }

  if (rulesToUpdate.length === 0) return errors;

  try {
    await withSpan({ name: 'unsecuredSavedObjectsClient.bulkUpdate', type: 'rules' }, () =>
      bulkUpdateRuleSo({
        savedObjectsClient: context.unsecuredSavedObjectsClient,
        rules: rulesToUpdate,
      })
    );
  } catch (err) {
    context.logger.error(
      `bulkCreateRules: bulkUpdate to demote ${rulesToUpdate.length} rules failed: ${err.message}`
    );
  }

  return errors;
};

export const flushKeysToInvalidate = async (
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
