/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ESQLParamsV1 } from '@kbn/response-ops-rule-params';
import type { SanitizedRule } from '../../../types';
import type { RulesClientContext } from '../../../rules_client';
import type { UpdateRuleData } from './update';
import { updateRule } from './update';

export type UpdateESQLRuleData = Omit<
  UpdateRuleData<ESQLParamsV1>,
  'alertTypeId' | 'consumer' | 'params' | 'schedule'
> & {
  schedule: string;
  esql: string;
  lookbackWindow: string;
  timeField: string;
  groupKey: string[];
  parentId?: string;
};

export async function updateESQLRule(
  context: RulesClientContext,
  ruleId: string,
  ruleData: UpdateESQLRuleData
): Promise<SanitizedRule<ESQLParamsV1>> {
  const { logger } = context;
  logger.info(`Updating ESQL rule ${ruleId}...`);

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
    ...(parentId && { parentId }),
  };

  const ruleDataForUpdate: UpdateRuleData<ESQLParamsV1> = {
    ...restOfRuleData,
    schedule: { interval: schedule },
    params,
  };

  const updatedRule = await updateRule(context, {
    id: ruleId,
    data: ruleDataForUpdate,
  });
  return updatedRule;
}
