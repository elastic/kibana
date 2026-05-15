/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import { i18n } from '@kbn/i18n';
import type { SavedObject } from '@kbn/core/server';
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
  addMissingUiamKeyTagIfNeeded,
  apiKeyAsAlertAttributes,
  apiKeyAsRuleDomainProperties,
} from '../../../../rules_client/common';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import type { RawRule, RuleTypeRegistry, SanitizedRule } from '../../../../types';
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
  PreparedRule,
  PrepareRuleArgs,
  ApiKeyEntry,
  BulkCreateOperationError,
  BulkCreateDisabledReason,
} from './types';

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
  // Tasks are scheduled disabled. Phase 5 enables them via taskManager.bulkEnable
  // so per-task validation drops never produce a running task without a rule SO,
  // and the activation can randomise schedule datetimes across the batch.
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

    const tagsWithUiamCheck = await addMissingUiamKeyTagIfNeeded(
      data.tags,
      apiKeyProps.uiamApiKey,
      apiKeyProps.apiKeyCreatedByUser,
      context.isServerless,
      context.featureFlags
    );

    const ruleAttributes = transformRuleDomainToRuleAttributes({
      actionsWithRefs,
      artifactsWithRefs,
      rule: {
        ...restData,
        tags: tagsWithUiamCheck,
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
export const demotePreparedRules = ({
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

export const flushKeysToInvalidate = async (
  keysToInvalidate: Set<string>,
  context: RulesClientContext
): Promise<void> => {
  if (keysToInvalidate.size === 0) return;
  // Note: ES Call via savedObjectsClient.bulkCreate() under the hood
  await bulkMarkApiKeysForInvalidation(
    { apiKeys: [...keysToInvalidate] },
    context.logger,
    context.unsecuredSavedObjectsClient
  );
  keysToInvalidate.clear();
};
