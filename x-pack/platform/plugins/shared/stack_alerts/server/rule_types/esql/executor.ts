/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { ALERT_GROUPING, ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { ESQLParams } from '@kbn/response-ops-rule-params/esql';
import { unflattenObject } from '@kbn/object-utils';

import type { ExecutorOptions, ESQLSourceFields } from './types';
import { fetchEsqlQuery } from './fetch_esql_query';

export async function executor(
  core: CoreSetup,
  options: ExecutorOptions<ESQLParams>,
  sourceFieldsParams: ESQLSourceFields
) {
  const {
    rule: { id: ruleId },
    services,
    params,
    state,
    spaceId,
    logger,
    getTimeRange,
  } = options;
  const { alertsClient, ruleResultService, scopedClusterClient, share } = services;

  if (!alertsClient) {
    throw new AlertsClientError();
  }
  const spacePrefix = spaceId !== 'default' ? spaceId : '';
  const alertLimit = alertsClient.getAlertLimitValue();
  const latestTimestamp: string | undefined = tryToParseAsDate(state.latestTimestamp);
  const { dateStart, dateEnd } = getTimeRange(`${params.timeWindowSize}${params.timeWindowUnit}`);

  const { results, sourceFieldsPerResult, groupingObjectsPerResult } = await fetchEsqlQuery({
    ruleId,
    alertLimit,
    params,
    spacePrefix,
    services: {
      share,
      scopedClusterClient,
      logger,
      ruleResultService,
    },
    dateStart,
    dateEnd,
    sourceFieldsParams,
  });

  const trackedAlerts = alertsClient.getTrackedAlerts() ?? [];
  const recoveredAlerts: any = [];
  const trackedAlertByAlertId: Record<string, any> = {};
  for (const alertUuid of Object.keys(trackedAlerts)) {
    const alert = trackedAlerts[alertUuid];
    const alertId = alert[ALERT_INSTANCE_ID];
    trackedAlertByAlertId[alertId] = alert;
    if (!results[alertId]) {
      recoveredAlerts.push({
        id: alertId,
        state: { latestTimestamp, dateStart, dateEnd },
        payload: {
          [ALERT_GROUPING]: alert[ALERT_GROUPING],
        },
      });
    }
  }

  const activeAlerts: any = [];
  const newAlerts: Set<string> = new Set<string>();
  for (const alertId of Object.keys(results)) {
    const sourceFields = sourceFieldsPerResult[alertId];
    const groupingObject = groupingObjectsPerResult[alertId]
      ? unflattenObject(groupingObjectsPerResult[alertId])
      : undefined;

    activeAlerts.push({
      id: alertId,
      state: { latestTimestamp, dateStart, dateEnd },
      payload: {
        [ALERT_GROUPING]: groupingObject,
        ...sourceFields,
      },
    });
    if (!trackedAlertByAlertId[alertId]) {
      newAlerts.add(alertId);
    }
  }

  alertsClient.writeAlerts(activeAlerts, recoveredAlerts, newAlerts);

  alertsClient.setAlertLimitReached(false);
  return { state: { latestTimestamp } };
}

export function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}
