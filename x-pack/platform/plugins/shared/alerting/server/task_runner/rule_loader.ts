/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTaskRunError,
  getUiamApiKeySecret,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import { type FakeRawRequest, type Headers, type KibanaRequest } from '@kbn/core-http-server';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ApiKeyType, type RunRuleParams, type TaskRunnerContext } from './types';
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import type { RawRule, RuleTypeRegistry, RuleTypeParamsValidator } from '../types';
import { RuleExecutionStatusErrorReasons } from '../types';
import type { RuleTypeParams } from '../../common';
import { MONITORING_HISTORY_LIMIT } from '../../common';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { getAlertFromRaw } from '../rules_client/lib';
import { UIAM_LOGS_USAGE_TAGS } from '../constants';
import {
  alertingUiamTelemetry,
  type CredentialReason,
  type CredentialType,
} from '../otel/uiam_telemetry';

interface RuleData {
  rawRule: RawRule;
  version: string | undefined;
  references: SavedObjectReference[];
}

interface ValidateRuleAndCreateFakeRequestParams<Params extends RuleTypeParams> {
  context: TaskRunnerContext;
  logger: Logger;
  paramValidator?: RuleTypeParamsValidator<Params>;
  ruleData: RuleData;
  ruleId: string;
  ruleTypeRegistry: RuleTypeRegistry;
  spaceId: string;
}

/**
 * With the decrypted rule saved object
 * - transform from domain model to application model (rule)
 * - create a fakeRequest object using the rule API key
 * - get an instance of the RulesClient using the fakeRequest
 */
export function validateRuleAndCreateFakeRequest<Params extends RuleTypeParams>(
  params: ValidateRuleAndCreateFakeRequestParams<Params>
): RunRuleParams<Params> {
  const {
    context,
    logger,
    paramValidator,
    ruleData: { rawRule, references, version },
    ruleId,
    ruleTypeRegistry,
    spaceId,
  } = params;

  const {
    enabled,
    apiKey,
    uiamApiKey,
    uiamApiKeyExternal,
    apiKeyCreatedByUser,
    apiKeyOwner,
    alertTypeId: ruleTypeId,
  } = rawRule;

  if (!enabled) {
    throw createTaskRunError(
      new ErrorWithReason(
        RuleExecutionStatusErrorReasons.Disabled,
        new Error(`Rule failed to execute because rule ran after it was disabled.`)
      ),
      TaskErrorSource.FRAMEWORK
    );
  }

  const { fakeRequest, effectiveApiKey } = getFakeKibanaRequest(context, spaceId, apiKey, {
    uiamApiKey,
    uiamApiKeyExternal,
    apiKeyCreatedByUser,
    apiKeyOwner,
    ruleId,
  });
  const rule = getAlertFromRaw({
    id: ruleId,
    isSystemAction: (actionId: string) => context.actionsPlugin.isSystemActionConnector(actionId),
    logger,
    rawRule,
    references,
    ruleTypeId,
    ruleTypeRegistry,
  });

  try {
    ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
  } catch (err) {
    throw createTaskRunError(
      new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err),
      TaskErrorSource.USER
    );
  }

  let validatedParams: Params;
  try {
    validatedParams = validateRuleTypeParams<Params>(rule.params, paramValidator);
  } catch (err) {
    throw createTaskRunError(
      new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err),
      TaskErrorSource.USER
    );
  }

  if (rule.monitoring) {
    if (rule.monitoring.run.history.length >= MONITORING_HISTORY_LIMIT) {
      // Remove the first (oldest) record
      rule.monitoring.run.history.shift();
    }
  }

  return {
    effectiveApiKey,
    fakeRequest,
    rule: { ...rule, snoozedInstances: rawRule.snoozedInstances ?? [] },
    validatedParams,
    version,
  };
}

/**
 * Loads the decrypted rule saved object
 */
export async function getDecryptedRule(
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string
): Promise<RuleData> {
  const namespace = context.spaceIdToNamespace(spaceId);

  let rawRule: SavedObject<RawRule>;

  try {
    rawRule = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      ruleId,
      { namespace }
    );
  } catch (e) {
    const error = new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, e);
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw createTaskRunError(error, TaskErrorSource.USER);
    }
    throw createTaskRunError(error, TaskErrorSource.FRAMEWORK);
  }

  return {
    version: rawRule.version,
    rawRule: rawRule.attributes,
    references: rawRule.references,
  };
}

/**
 * Builds the fake request a rule run executes under AND returns the resolved
 * credential it authenticates with, so callers (e.g. `ActionScheduler`) can
 * enqueue scheduled connector tasks under the same key. `effectiveApiKey` is
 * the value that was placed after `ApiKey ` in the request's `Authorization`
 * header — the base64 `id:secret` for ES rules, or the decoded raw `essu_…`
 * UIAM secret for UIAM rules.
 */
export interface GetFakeKibanaRequestOptions {
  uiamApiKey?: RawRule['uiamApiKey'];
  uiamApiKeyExternal?: RawRule['uiamApiKeyExternal'];
  apiKeyCreatedByUser?: RawRule['apiKeyCreatedByUser'];
  apiKeyOwner?: RawRule['apiKeyOwner'];
  ruleId?: string;
}

export function getFakeKibanaRequest(
  context: TaskRunnerContext,
  spaceId: string,
  apiKey: RawRule['apiKey'],
  options: GetFakeKibanaRequestOptions = {}
): { fakeRequest: KibanaRequest; effectiveApiKey: string | null } {
  const { uiamApiKey, uiamApiKeyExternal, apiKeyCreatedByUser, apiKeyOwner, ruleId } = options;
  const requestHeaders: Headers = {};
  let effectiveApiKey: string | null = null;
  let credentialType: CredentialType = 'none';
  let credentialReason: CredentialReason = 'not_set';
  // Whether the credential the run ends up presenting is a user-created (external) Cloud API key.
  // `uiamApiKeyExternal` is UIAM's own verdict (`AuthenticatedUser.api_key.internal === false`),
  // captured when the rule was created or updated; absent means internal treatment (fail closed).
  // Only meaningful on the branches that actually present `uiamApiKey`.
  let isExternalCredential = false;

  const shouldUseUiamApiKey = context.shouldGrantUiam && context.apiKeyType === ApiKeyType.UIAM;

  if (shouldUseUiamApiKey) {
    if (!uiamApiKey) {
      if (apiKey) {
        requestHeaders.authorization = `ApiKey ${apiKey}`;
        effectiveApiKey = apiKey;
        credentialType = 'es_api_key';
        // Refined to a more specific reason in the branches below.
        credentialReason = 'fallback_unexpected';
      }
      if (apiKeyCreatedByUser && apiKey) {
        credentialReason = 'user_created_key';
        alertingUiamTelemetry.recordUiamApiKeyFallback('user_created_key');
        context.logger.debug(
          'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
          {
            labels: { ...(ruleId && { ruleId }), spaceId },
            tags: UIAM_LOGS_USAGE_TAGS,
          }
        );
      } else if (isLikelyNonCloudUserApiKeyOwner(apiKeyOwner)) {
        if (apiKey) {
          credentialReason = 'fallback_likely_non_cloud_user';
        }
        alertingUiamTelemetry.recordUiamApiKeyFallback('likely_non_cloud_user');
        context.logger.debug(
          'UIAM API key is not provided because the Elasticsearch API key creator is likely a non-Cloud user, falling back to regular API key.',
          {
            labels: { ...(ruleId && { ruleId }), spaceId },
            tags: UIAM_LOGS_USAGE_TAGS,
          }
        );
      } else {
        // Some deployments legitimately cannot mint UIAM keys, so this fallback is
        // expected in the wild and is logged at debug level to avoid noise. Volume
        // and reason are tracked via the
        // `kibana.alerting.rule_run.uiam_api_key_fallback.count` OTel counter
        // instead, which is broken down per project.
        alertingUiamTelemetry.recordUiamApiKeyFallback('unexpected');
        context.logger.debug(
          'UIAM API key is not provided to create a fake request, falling back to regular API key.',
          {
            labels: { ...(ruleId && { ruleId }), spaceId },
            tags: UIAM_LOGS_USAGE_TAGS,
          }
        );
      }
    } else {
      const uiamApiKeyValue = getUiamApiKeySecret(uiamApiKey);
      requestHeaders.authorization = `ApiKey ${uiamApiKeyValue}`;
      effectiveApiKey = uiamApiKeyValue;
      credentialType = 'uiam_api_key';
      credentialReason = apiKeyCreatedByUser ? 'user_created_key' : 'provisioned';
      isExternalCredential = uiamApiKeyExternal === true;
    }
  } else if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
    effectiveApiKey = apiKey;
    credentialType = 'es_api_key';
    credentialReason = 'config';
  } else if (uiamApiKey) {
    // Rules created with a user-supplied Cloud (UIAM) API key — and UIAM-cloned rules —
    // persist only a UIAM credential. Fall back to it when the strategy would otherwise
    // use the ES key, mirroring `EsAndUiamApiKeyStrategy.getApiKeyForFakeRequest` in
    // @kbn/task-manager-plugin, instead of yielding an unauthenticated request.
    context.logger.debug(
      'ES API key is not provided to create a fake request, falling back to UIAM API key.',
      {
        labels: { ...(ruleId && { ruleId }), spaceId },
        tags: UIAM_LOGS_USAGE_TAGS,
      }
    );
    const uiamApiKeyValue = getUiamApiKeySecret(uiamApiKey);
    requestHeaders.authorization = `ApiKey ${uiamApiKeyValue}`;
    effectiveApiKey = uiamApiKeyValue;
    credentialType = 'uiam_api_key';
    credentialReason = apiKeyCreatedByUser ? 'user_created_key' : 'provisioned';
    isExternalCredential = uiamApiKeyExternal === true;
  }

  alertingUiamTelemetry.recordRuleRun(credentialType, credentialReason);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: brandSpaceId(spaceId),
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  // The Elasticsearch cluster client must not attach the UIAM shared secret to a user-created
  // (external) Cloud API key: UIAM rejects external keys presented with client authentication.
  if (isExternalCredential) {
    markExternalUiamCredential(fakeRequest);
  }

  return { fakeRequest, effectiveApiKey };
}

const isLikelyNonCloudUserApiKeyOwner = (apiKeyOwner?: string | null): boolean => {
  if (typeof apiKeyOwner !== 'string') {
    return false;
  }

  const trimmedApiKeyOwner = apiKeyOwner.trim();
  return trimmedApiKeyOwner.length > 0 && !/^\d+$/.test(trimmedApiKeyOwner);
};
