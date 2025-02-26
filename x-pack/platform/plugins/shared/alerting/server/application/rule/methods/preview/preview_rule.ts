/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { trim, truncate } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { calculateSchedule } from '../../../../backfill_client/lib';
import { adHocRunStatus } from '../../../../../common/constants';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { apiKeyAsRuleDomainProperties } from '../../../../rules_client/common';
import { validateRuleTypeParams } from '../../../../lib';
import { RulesClientContext } from '../../../../rules_client/types';
import { RuleParams } from '../../types';
import type { PreviewRuleData } from './types';

export interface PreviewRuleParams<Params extends RuleParams = never> {
  data: PreviewRuleData<Params>;
}

export interface PreviewResults {
  uuid: string;
  alerts: any[];
  actions: any[];
}

export async function previewRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  previewParams: PreviewRuleParams<Params>
  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
): Promise<PreviewResults> {
  const executionUuid = uuidv4();
  const temporaryRuleId = `preview-${uuidv4()}`;
  const { data } = previewParams;

  // authorization stuff here

  context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

  // throw error if rule type is not registered
  const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
  const ruleTypeActionGroups = new Map(
    ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
  );

  const validatedRuleTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  const username = await context.getUserName();

  // create an API key for the enable and invalidate at the end
  let createdAPIKey = null;
  try {
    const name = truncate(`AlertingPreview: ${ruleType.id}/${trim(data.name)}`, { length: 256 });
    createdAPIKey = await context.createAPIKey(name);
  } catch (error) {
    throw Boom.badRequest(`Error previewing rule: could not create API key - ${error.message}`);
  }

  // create an ad hoc run SO
  const apiKey = apiKeyAsRuleDomainProperties(createdAPIKey, username, false).apiKey;
  if (!apiKey) {
    throw Boom.badRequest('Error previewing rule: could not create API key');
  }

  const start = new Date().toISOString();
  const schedule = calculateSchedule(start, data.schedule.interval);

  const adHocSOToCreate: AdHocRunSO = {
    apiKeyId: Buffer.from(apiKey, 'base64').toString().split(':')[0],
    apiKeyToUse: apiKey!,
    createdAt: new Date().toISOString(),
    duration: data.schedule.interval,
    enabled: true,
    executionUuid,
    rule: {
      name: data.name,
      tags: data.tags,
      alertTypeId: data.alertTypeId,
      params: data.params,
      apiKeyOwner: username,
      apiKeyCreatedByUser: false,
      actions: [],
      consumer: data.consumer,
      enabled: true,
      schedule: data.schedule,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 0,
    },
    spaceId: context.spaceId,
    start: new Date().toISOString(),
    status: adHocRunStatus.PENDING,
    schedule,
  };

  const createdSO: SavedObject<AdHocRunSO> = await context.unsecuredSavedObjectsClient.create(
    AD_HOC_RUN_SAVED_OBJECT_TYPE,
    [
      adHocSOToCreate,
      {
        references: [{ id: temporaryRuleId, name: `rule preview`, type: RULE_SAVED_OBJECT_TYPE }],
      },
    ]
  );

  // schedule an ad hoc task
  await context.taskManager.schedule({
    taskType: 'ad_hoc_run-preview',
    params: {
      adHocRunParamsId: createdSO.id,
      spaceId: context.spaceId,
    },
    state: {},
    scope: ['alerting'],
  });
}
