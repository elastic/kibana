/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';
import { i18n } from '@kbn/i18n';
import type { TaskInstanceWithDeprecatedFields } from '@kbn/task-manager-plugin/server/task';

import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
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
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RuleDomain, RuleParams } from '../../types';
import { transformRuleDomainToRuleAttributes } from '../../transforms';
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

// Create tasks `enabled:true`, runAt / scheduledAt intentionally omitted.
// TM addJitter (PR# 269991) applies on bulkSchedule(), significantly speeding up the process.
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
  enabled: true,
});

export const prepareRule = async <Params extends RuleParams>({
  context,
  actionsClient,
  username,
  id,
  rule,
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

    // Mint API key for enabled rules.
    // Soft-fail: a key-mint failure does NOT reject the rule. We persist it as
    // disabled, push a degraded error so the caller knows.
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
