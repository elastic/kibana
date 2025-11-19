/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreSetup } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { ESQLParams } from '@kbn/response-ops-rule-params/esql';

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

  const { results } = await fetchEsqlQuery({
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

  const recoveredAlerts: any = [];
  const activeAlerts: any = [];
  const newAlerts: Set<string> = new Set<string>();
  for (const key of Object.keys(results)) {
    const source = results[key][0]._source;
    const status = source.status ?? 'active';
    delete source.status;

    const alertId = uuidv4();
    if (status !== 'recovered') {
      activeAlerts.push({
        id: alertId,
        state: { latestTimestamp, dateStart, dateEnd },
        payload: {
          attrs: source,
        },
      });
    } else {
      recoveredAlerts.push({
        id: alertId,
        state: { latestTimestamp, dateStart, dateEnd },
        payload: {
          attrs: source,
        },
      });
    }
    if (status === 'active') {
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
