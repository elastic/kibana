/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { type FakeRawRequest, type Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { RunRuleParams, TaskRunnerContext } from './types';
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import {
  RuleExecutionStatusErrorReasons,
  RawRule,
  RuleTypeRegistry,
  RuleTypeParamsValidator,
} from '../types';
import { MONITORING_HISTORY_LIMIT, RuleTypeParams } from '../../common';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { getAlertFromRaw } from '../rules_client/lib';

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

  const { enabled, apiKey, alertTypeId: ruleTypeId } = rawRule;

  if (!enabled) {
    throw createTaskRunError(
      new ErrorWithReason(
        RuleExecutionStatusErrorReasons.Disabled,
        new Error(`Rule failed to execute because rule ran after it was disabled.`)
      ),
      TaskErrorSource.FRAMEWORK
    );
  }

  const fakeRequest = getFakeKibanaRequest(context, spaceId, apiKey);
  const rule = getAlertFromRaw({
    id: ruleId,
    includeLegacyId: false,
    isSystemAction: (actionId: string) => context.actionsPlugin.isSystemActionConnector(actionId),
    logger,
    omitGeneratedValues: false,
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
    apiKey,
    fakeRequest,
    rule,
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

export function getFakeKibanaRequest(
  context: TaskRunnerContext,
  spaceId: string,
  apiKey: RawRule['apiKey']
) {
  const requestHeaders: Headers = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);
  context.basePathService.set(fakeRequest, path);

  return fakeRequest;
}
