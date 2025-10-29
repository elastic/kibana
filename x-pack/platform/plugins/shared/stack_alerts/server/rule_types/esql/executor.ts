/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { ALERT_REASON, ALERT_URL, ALERT_GROUPING } from '@kbn/rule-data-utils';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { ESQLParams } from '@kbn/response-ops-rule-params/esql';
import { unflattenObject } from '@kbn/object-utils';

import type { ESQLActionContext } from './action_context';
import { addMessages } from './action_context';
import type { ExecutorOptions, ESQLSourceFields } from './types';
import { ActionGroupId } from '../../../common/esql';
import { fetchEsqlQuery } from './fetch_esql_query';
import { ALERT_TITLE } from '..';

export async function executor(
  core: CoreSetup,
  options: ExecutorOptions<ESQLParams>,
  sourceFieldsParams: ESQLSourceFields
) {
  const {
    rule: { id: ruleId, name },
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
  const currentTimestamp = new Date().toISOString();
  const spacePrefix = spaceId !== 'default' ? spaceId : '';
  const alertLimit = alertsClient.getAlertLimitValue();
  const latestTimestamp: string | undefined = tryToParseAsDate(state.latestTimestamp);
  const { dateStart, dateEnd } = getTimeRange(`${params.timeWindowSize}${params.timeWindowUnit}`);

  const { results, link, sourceFieldsPerResult, groupingObjectsPerResult } = await fetchEsqlQuery({
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

  for (const alertId of Object.keys(results)) {
    const hits = results[alertId];
    const sourceFields = sourceFieldsPerResult[alertId];
    const groupingObject = groupingObjectsPerResult[alertId]
      ? unflattenObject(groupingObjectsPerResult[alertId])
      : undefined;
    const baseContext: ESQLActionContext = {
      title: name,
      date: currentTimestamp,
      hits,
      link,
      sourceFields,
    };

    const actionContext = addMessages({
      ruleName: name,
      baseContext,
      params,
      group: alertId,
    });

    alertsClient.report({
      id: alertId,
      actionGroup: ActionGroupId,
      state: { latestTimestamp, dateStart, dateEnd },
      context: actionContext,
      payload: {
        [ALERT_URL]: actionContext.link,
        [ALERT_REASON]: actionContext.message,
        [ALERT_TITLE]: actionContext.title,
        [ALERT_GROUPING]: groupingObject,
        ...actionContext.sourceFields,
      },
    });
  }

  alertsClient.setAlertLimitReached(false);
  return { state: { latestTimestamp } };
}

export function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}
