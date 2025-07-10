/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chunk } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client';
import type { createBodySchemaV1 as alertRuleBodySchema } from '@kbn/alerting-plugin/common/routes/rule/apis/create';

import type { KibanaSavedObjectType } from '../../../../types';

export interface AlertRuleAsset {
  id: string;
  type: KibanaSavedObjectType.alert;
  template: Omit<TypeOf<typeof alertRuleBodySchema>, 'actions'>;
}

export async function installAlertRules({
  logger,
  alertingRulesClient,
  alertRuleAssets,
  assetsChunkSize,
}: {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAssets: AlertRuleAsset[];
  assetsChunkSize?: number;
}) {
  if (!assetsChunkSize || alertRuleAssets.length <= assetsChunkSize) {
    return await installAlertRuleChunk({ logger, alertingRulesClient, alertRuleAssets });
  }

  const alertRuleChunks = chunk(alertRuleAssets, assetsChunkSize);
  const results = [];
  for (const alertRuleChunk of alertRuleChunks) {
    const result = await installAlertRuleChunk({
      logger,
      alertingRulesClient,
      alertRuleAssets: alertRuleChunk,
    });
    results.push(result);
  }

  return results;
}

async function installAlertRuleChunk({
  logger,
  alertingRulesClient,
  alertRuleAssets,
}: {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAssets: AlertRuleAsset[];
}) {
  const alertRuleInstalls = alertRuleAssets.map((alertRuleAsset) => {
    return installAlertRule({ logger, alertingRulesClient, alertRuleAsset });
  });

  return await Promise.allSettled(alertRuleInstalls);
}

async function installAlertRule({
  logger,
  alertingRulesClient,
  alertRuleAsset,
}: {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAsset: AlertRuleAsset;
}) {
  const { template: alertRule, id } = alertRuleAsset;

  const createData = transformToCreateAlertRule(alertRule);

  try {
    const result = await alertingRulesClient.create({ data: createData, options: { id } });
    return result;
  } catch (e) {
    // Already exists
    if (e?.output?.statusCode === 409) {
      const result = await alertingRulesClient.update({
        data: createData,
        id,
      });
      return result;
    }
    throw e;
  }
}

function transformToCreateAlertRule(template: AlertRuleAsset['template']) {
  const {
    rule_type_id: _ruleTypeId,
    alert_delay: _alertDelay,
    notify_when: _notifyWhen,
    ...baseCreateData
  } = template;

  return {
    ...baseCreateData,
    // Always disabled
    enabled: false,
    alertTypeId: template.rule_type_id,
    flapping: template.flapping
      ? {
          lookBackWindow: template.flapping.look_back_window,
          statusChangeThreshold: template.flapping.status_change_threshold,
        }
      : undefined,
    ...(template.alert_delay ? { alertDelay: template.alert_delay } : {}),
    ...(template.notify_when ? { notifyWhen: template.notify_when } : {}),
    // Always include 'Managed' tag
    tags: [...new Set([...template.tags, 'Managed'])],
    // Always no prescribed actions
    actions: [],
  };
}
