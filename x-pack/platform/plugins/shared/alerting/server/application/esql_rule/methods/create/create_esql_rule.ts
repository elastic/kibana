/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ESQLParamsV1 } from '@kbn/response-ops-rule-params';
import { v4 as uuidv4 } from 'uuid';
import type { SanitizedRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client';
import type { CreateRuleData } from '../../../rule/methods/create';
import { createRule } from '../../../rule/methods/create';
import type { CreateESQLRuleData } from './types';

async function createRecoveryRule(
  context: RulesClientContext,
  parentRuleId: string,
  recoveryRuleId: string,
  ruleData: CreateESQLRuleData,
  groupKey: string[],
  track: {
    recovery: {
      enabled: boolean;
      recoveryQuery?: string;
      lookbackWindow?: string;
      schedule?: string;
    };
  }
) {
  try {
    let recoveryEsql: string;

    if (track.recovery.recoveryQuery) {
      recoveryEsql = track.recovery.recoveryQuery.replace(/\?rule_id/g, `"${parentRuleId}"`);
    } else {
      throw new Error('Recovery query is required when recovery is enabled.');
    }

    const recoveryLookbackWindow = track.recovery.lookbackWindow || ruleData.lookbackWindow;
    const durationMatch = recoveryLookbackWindow.match(/^(\d+)([smhd])$/);
    const timeWindowSize = durationMatch ? parseInt(durationMatch[1], 10) : 0;
    const timeWindowUnit = durationMatch ? durationMatch[2] : 'm';

    const recoveryRuleData: CreateRuleData<ESQLParamsV1> = {
      ...ruleData,
      name: `${ruleData.name} - RECOVERY`,
      tags: [...(ruleData.tags || []), 'internal'],
      internal: true,
      schedule: {
        interval: track.recovery.schedule || ruleData.schedule,
      },
      params: {
        groupKey,
        timeField: ruleData.timeField,
        parentId: parentRuleId,
        role: 'recovery',
        esqlQuery: {
          esql: recoveryEsql,
        },
        timeWindowSize,
        timeWindowUnit,
      },
      artifacts: {
        rules: [{ id: parentRuleId }],
      },
      alertTypeId: '.esql',
      consumer: 'alerts',
      actions: [],
    };
    return createRule(context, { data: recoveryRuleData, options: { id: recoveryRuleId } });
  } catch (e) {
    context.logger.error(`Failed to create recovery rule for parent rule ${parentRuleId}.`, e);
    // Re-throw the error to ensure the API call fails
    throw e;
  }
}

export async function createESQLRule(
  context: RulesClientContext,
  ruleData: CreateESQLRuleData
): Promise<SanitizedRule<ESQLParamsV1>> {
  context.logger.debug(`Creating ESQL rule: ${ruleData.name}`);
  const parentRuleId = ruleData.id || uuidv4();
  const recoveryRuleId = uuidv4();

  const { esql, lookbackWindow, timeField, groupKey, parentId, schedule, ...restOfRuleData } =
    ruleData;

  const durationMatch = lookbackWindow.match(/^(\d+)([smhd])$/);
  const timeWindowSize = durationMatch ? parseInt(durationMatch[1], 10) : 0;
  const timeWindowUnit = durationMatch ? durationMatch[2] : 'm';

  const params: ESQLParamsV1 = {
    esqlQuery: {
      esql,
    },
    timeWindowSize,
    timeWindowUnit,
    timeField,
    groupKey,
    role: 'parent',
    ...(parentId && { parentId }),
  };

  const ruleDataForCreate: CreateRuleData<ESQLParamsV1> = {
    ...restOfRuleData,
    schedule: { interval: ruleData.schedule },
    params,
    artifacts: {
      rules: [...(ruleData.track?.recovery ? [{ id: recoveryRuleId }] : [])].filter(Boolean),
    },
    internal: false,
    alertTypeId: '.esql',
    consumer: 'alerts',
    actions: [],
  };

  const createPromises = [
    createRule(context, { data: ruleDataForCreate, options: { id: parentRuleId } }),
  ];

  if (ruleData.track?.recovery?.enabled) {
    context.logger.debug(
      `Recovery tracking is enabled for rule: ${parentRuleId}. Creating recovery rule.`
    );
    createPromises.push(
      createRecoveryRule(context, parentRuleId, recoveryRuleId, ruleData, groupKey, {
        recovery: ruleData.track.recovery,
      })
    );
  }

  const createdRules = await Promise.all(createPromises);

  return createdRules.find((rule) => rule.id === parentRuleId)!;
}
