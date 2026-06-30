/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { withSpan } from '@kbn/apm-utils';
import { v4 as uuidv4 } from 'uuid';
import type { ExecuteResult } from './schemas';
import { generateAPIKeyName } from '../../../../rules_client/common/generate_api_key_name';
import type { ExecuteParams } from './schemas';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RuleDomain } from '../../../rule/types/rule';
import { backfillInitiator } from '../../../../../common/constants';
import type { ScheduleExecutionParam } from '../../types';

export const execute = async (
  context: RulesClientContext,
  params: ExecuteParams
): Promise<ExecuteResult> => {
  const { ruleTypeId, ruleParams, ruleConsumer } = params;
  const client = context.adHocExecutionClient;

  // Validate rule type exists and is enabled
  const ruleType = context.ruleTypeRegistry.get(ruleTypeId);
  if (!ruleType) {
    throw new Error(
      i18n.translate('xpack.alerting.adHoc.execute.ruleTypeNotFound', {
        defaultMessage: 'Rule type "{ruleTypeId}" not found',
        values: { ruleTypeId },
      })
    );
  }

  const ruleId = uuidv4();
  const now = new Date();

  // Generate API key for the ad-hoc execution
  const name = generateAPIKeyName(ruleTypeId, 'Ad-hoc Execution');
  const isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();

  const apiKeyResult = isAuthTypeApiKey
    ? context.getAuthenticationAPIKey(`${name}-user-created`)
    : await withSpan(
        {
          name: 'createAPIKey',
          type: 'rules',
        },
        () => context.createAPIKey(name, '1h')
      );

  const apiKey =
    apiKeyResult && 'apiKeysEnabled' in apiKeyResult && apiKeyResult.apiKeysEnabled
      ? Buffer.from(`${apiKeyResult.result.id}:${apiKeyResult.result.api_key}`).toString('base64')
      : null;

  if (!apiKey) {
    throw new Error(
      i18n.translate('xpack.alerting.adHoc.execute.apiKeyGenerationFailed', {
        defaultMessage: 'Failed to generate API key for ad-hoc execution',
      })
    );
  }

  // Construct a transient RuleDomain object
  const rule: RuleDomain<Record<string, unknown>> = {
    id: ruleId, // Generated ID for ad-hoc execution
    consumer: ruleConsumer,
    params: ruleParams,
    name: 'Ad-hoc Execution', // Placeholder name
    schedule: { interval: '1m' }, // Dummy schedule
    actions: [],
    tags: [],
    notifyWhen: 'onActiveAlert',
    enabled: true,
    alertTypeId: ruleTypeId,
    apiKeyOwner: 'user',
    apiKey,
    revision: 1,
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: now,
    updatedAt: now,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'ok',
      lastExecutionDate: now,
      error: undefined,
      warning: undefined,
    },
  };

  const range = {
    start: now.toISOString(),
    end: now.toISOString(),
  };

  const scheduleParam: ScheduleExecutionParam = {
    ruleId,
    start: range.start,
    end: range.end,
    initiator: backfillInitiator.USER,
  };

  const eventLogClient = await context.getEventLogClient();

  const result = await client.queueAdHocExecution({
    auditLogger: context.auditLogger,
    params: [scheduleParam],
    rules: [rule as RuleDomain],
    spaceId: context.spaceId,
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    eventLogClient,
    internalSavedObjectsRepository: context.internalSavedObjectsRepository,
    eventLogger: context.eventLogger,
  });

  const item = result[0];

  if (!item) {
    throw new Error(
      i18n.translate('xpack.alerting.adHoc.execute.failedToQueue', {
        defaultMessage: 'Failed to queue ad-hoc execution',
      })
    );
  }

  if ('error' in item && item.error) {
    throw new Error(item.error.message);
  }

  // Check for bulkCreateError property which might exist if we unified error types or if legacy type leaking
  // But our new types don't define bulkCreateError, they define ExecutionError.
  // ExecutionError = { error: { message }, ruleId, ruleName }
  // So 'error' check above covers it.

  if (!('id' in item)) {
    throw new Error('Unknown error during ad-hoc execution queueing');
  }

  return {
    id: item.id,
    execution_date: now.toISOString(),
  };
};
