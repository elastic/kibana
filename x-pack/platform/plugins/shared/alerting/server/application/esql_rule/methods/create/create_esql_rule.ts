/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ESQLParams } from '@kbn/response-ops-rule-params';
import { v4 as uuidv4 } from 'uuid';
import type { SanitizedRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client';
import type { CreateRuleData } from '../../../rule/methods/create';
import { createRule } from '../../../rule/methods/create';
import type { CreateESQLRuleData } from './types';

export async function createESQLRule(
  context: RulesClientContext,
  ruleData: CreateESQLRuleData
): Promise<SanitizedRule<ESQLParams>> {
  const ruleId = uuidv4();
  context.logger.debug(`Creating ESQL rule with ruleId: ${ruleId}.`);

  const { esql, lookbackWindow, timeField, groupKey, schedule, ...restOfRuleData } = ruleData;

  const durationMatch = lookbackWindow.match(/^(\d+)([smhd])$/);
  const timeWindowSize = durationMatch ? parseInt(durationMatch[1], 10) : 0;
  const timeWindowUnit = durationMatch ? durationMatch[2] : 'm';

  const params: ESQLParams = {
    esqlQuery: {
      esql,
    },
    timeWindowSize,
    timeWindowUnit,
    timeField,
    groupKey,
  };

  const ruleDataForCreate: CreateRuleData<ESQLParams> = {
    ...restOfRuleData,
    alertTypeId: '.esql',
    consumer: 'alerts',
    schedule: { interval: schedule },
    params,
    actions: [],
  };

  const createdRule = await createRule(context, {
    data: ruleDataForCreate,
    options: { id: ruleId },
  });
  context.logger.debug(`Successfully created ESQL rule with ruleId: ${ruleId}.`);
  return createdRule;
}
