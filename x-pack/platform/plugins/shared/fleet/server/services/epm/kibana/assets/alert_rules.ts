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

import { KibanaSavedObjectType, type PackageSpecTags } from '../../../../types';

import { getManagedTagId, getPackageTagId } from './tag_assets';

export interface AlertRuleAsset {
  id: string;
  type: KibanaSavedObjectType.alert;
  template: Omit<TypeOf<typeof alertRuleBodySchema>, 'actions'>;
}

interface ObjectReference {
  type: string;
  id: string;
}

interface InstallAlertRulesParamsContext {
  pkgName: string;
  spaceId: string;
  assetTags?: PackageSpecTags[];
}

interface InstallAlertRulesParams {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAssets: AlertRuleAsset[];
  context: InstallAlertRulesParamsContext;
  assetsChunkSize?: number;
}

export async function installAlertRules({
  logger,
  alertingRulesClient,
  alertRuleAssets,
  context,
  assetsChunkSize,
}: InstallAlertRulesParams): Promise<ObjectReference[]> {
  let results: Array<PromiseSettledResult<ObjectReference>> = [];

  if (!assetsChunkSize || alertRuleAssets.length <= assetsChunkSize) {
    results = await installAlertRuleChunk({
      logger,
      alertingRulesClient,
      alertRuleAssets,
      context,
    });
  } else {
    const alertRuleChunks = chunk(alertRuleAssets, assetsChunkSize);

    for (const alertRuleChunk of alertRuleChunks) {
      const result = await installAlertRuleChunk({
        logger,
        alertingRulesClient,
        alertRuleAssets: alertRuleChunk,
        context,
      });
      results = [...results, ...result];
    }
  }

  const { successes, errors } = getSuccessesAndErrors(results);

  if (errors.length > 0) {
    throw new Error(
      `Encountered ${errors.length} errors installing alert rule assets: ${JSON.stringify(
        errors,
        null,
        2
      )}`
    );
  }

  return successes;
}

async function installAlertRuleChunk({
  logger,
  alertingRulesClient,
  alertRuleAssets,
  context,
}: {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAssets: AlertRuleAsset[];
  context: InstallAlertRulesParamsContext;
}) {
  const alertRuleInstalls = alertRuleAssets.map((alertRuleAsset) => {
    return installAlertRule({ logger, alertingRulesClient, alertRuleAsset, context });
  });

  return await Promise.allSettled(alertRuleInstalls);
}

async function installAlertRule({
  logger,
  alertingRulesClient,
  alertRuleAsset,
  context: { pkgName, spaceId, assetTags },
}: {
  logger: Logger;
  alertingRulesClient: RulesClient;
  alertRuleAsset: AlertRuleAsset;
  context: InstallAlertRulesParamsContext;
}) {
  const { template: alertRule, id } = alertRuleAsset;
  const tags = [getPackageTagId(spaceId, pkgName), getManagedTagId(spaceId)];

  const createData = transformToCreateAlertRule(alertRule, tags);

  try {
    const result = await alertingRulesClient.create({ data: createData, options: { id } });
    return { id: result.id, type: KibanaSavedObjectType.alert };
  } catch (e) {
    // Already exists
    if (e?.output?.statusCode === 409) {
      const result = await alertingRulesClient.update({
        data: createData,
        id,
      });
      return { id: result.id, type: KibanaSavedObjectType.alert };
    }
    throw e;
  }
}

function transformToCreateAlertRule(template: AlertRuleAsset['template'], tags: string[]) {
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
    // Always no prescribed actions
    actions: [],
    tags: [...new Set([...baseCreateData.tags, ...tags])],
  };
}

function getSuccessesAndErrors(results: Array<PromiseSettledResult<ObjectReference>>) {
  return results.reduce<{ successes: ObjectReference[]; errors: string[] }>(
    (acc, result) => {
      if (result.status === 'fulfilled') {
        acc.successes = [...acc.successes, result.value];
      } else {
        acc.errors = [...acc.errors, result.reason];
      }
      return acc;
    },
    { successes: [], errors: [] }
  );
}
