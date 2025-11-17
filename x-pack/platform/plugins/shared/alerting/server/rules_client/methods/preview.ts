/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { createEsClientWithMeta } from '../../routes/rule/apis/execute/es_client_meta_wrapper';
import type {
  AsyncSearchParams,
  AsyncSearchStrategies,
  RuleExecutorOptions,
  RuleExecutorServices,
} from '../../types';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import type { RulesClientContext } from '../types';
import { DISABLE_FLAPPING_SETTINGS } from '../../types';

export async function preview(
  context: RulesClientContext,
  {
    esClient,
    requestParams,
    ruleType,
    savedObjectsClient,
    dataViewsService,
    searchSourceClient,
    getSpaceId,
    share,
    uiSettingsClient,
  }: any
) {
  try {
    // const [, { data, dataViews, share }] = await core.getStartServices();
    const esQueries: any[] = [];
    const asCurrentUserWithMeta = createEsClientWithMeta(esClient, esQueries);

    const services: RuleExecutorServices = {
      alertsClient: {
        isTrackedAlert: () => false,
        getAlertLimitValue: () => 1000,
        setAlertLimitReached: () => {},
        getRecoveredAlerts: () => [],
        setAlertData: () => {},
        report: () => {
          return {
            uuid: uuidv4(),
          };
        },
      },
      getDataViews: async () => dataViewsService,
      getMaintenanceWindowIds: async () => [],
      getSearchSourceClient: async () => searchSourceClient,
      savedObjectsClient,
      scopedClusterClient: {
        asCurrentUser: asCurrentUserWithMeta,
      },
      share,
      shouldStopExecution: () => false,
      shouldWriteAlerts: () => false,
      uiSettingsClient,
      getAsyncSearchClient: <T extends AsyncSearchParams>(strategy: AsyncSearchStrategies) => {
        throw new Error('Not implemented');
      },
    };

    const rule = {
      id: uuidv4(),
      ...requestParams,
      actions: requestParams.actions || [],
      schedule: requestParams.schedule || { interval: '1m' },
      enabled: requestParams.enabled === undefined ? true : requestParams.enabled,
      name: requestParams.name || 'On-demand execution',
      tags: requestParams.tags || [],
      throttle: requestParams.throttle || null,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKeyOwner: 'elastic',
      notifyWhen: 'onActionGroup',
      consumer: requestParams.consumer,
      rule_type_id: requestParams.rule_type_id,
      params: requestParams.params,
    };

    const options: RuleExecutorOptions = {
      executionId: uuidv4(),
      logger: context.logger,
      params: requestParams.params,
      previousStartedAt: null,
      rule,
      services,
      spaceId: getSpaceId,
      startedAt: new Date(),
      startedAtOverridden: false,
      state: {},
      namespace: getSpaceId,
      flappingSettings: DISABLE_FLAPPING_SETTINGS,
      // TODO: Fix look back window
      getTimeRange: () => ({ from: 'now-5m', to: 'now' }),
      // TODO: Fix serverless
      isServerless: false,
    };

    await ruleType.executor(options);

    return esQueries;
  } catch (error) {
    console.log('error', error);
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RUN_SOON,
        // savedObject: { type: RULE_SAVED_OBJECT_TYPE, rule.id, name: attributes.name },
        error,
      })
    );
    throw error;
  }
}
