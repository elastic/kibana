/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import type { CoreSetup } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { FieldsObject } from '@kbn/alerting-rule-utils';

import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { EsqlRuleParams } from '@kbn/response-ops-rule-params/esql';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';

import type { ExecutorOptions, OnlyEsqlQueryRuleParams } from './types';
import { fetchEsqlQuery } from './lib/fetch_esql_query';

export interface EsQueryRuleActionContext extends AlertInstanceContext {
  // the date the rule was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number;
  // threshold conditions
  conditions: string;
  // query matches
  hits: estypes.SearchHit[];
  // a link to see records that triggered the rule for Discover rule
  // a link which navigates to stack management in case of Elastic query rule
  link: string;
  sourceFields: string[];
  grouping?: FieldsObject;
}

export async function executor(core: CoreSetup, options: ExecutorOptions<EsqlRuleParams>) {
  const {
    rule: { id: ruleId, schedule },
    services,
    params,
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
  // For ungrouped queries, we run the configured query during each rule run, get a hit count
  // and retrieve up to params.size hits. We evaluate the threshold condition using the
  // value of the hit count. If the threshold condition is met, the hits are counted
  // toward the query match and we update the rule state with the timestamp of the latest hit.
  // In the next run of the rule, the latestTimestamp will be used to gate the query in order to
  // avoid counting a document multiple times.
  // latestTimestamp will be ignored if set for grouped queries
  const { dateStart, dateEnd } = getTimeRange(schedule.interval);

  const { parsedResults, link, index } = await fetchEsqlQuery({
    ruleId,
    alertLimit,
    params: params as OnlyEsqlQueryRuleParams,
    spacePrefix,
    services: {
      share,
      scopedClusterClient,
      logger,
      ruleResultService,
    },
    dateStart,
    dateEnd,
  });

  for (const result of parsedResults.results) {
    alertsClient.report({
      id: v4(),
      actionGroup: 'query matched',
      state: {},
      context: {},
      payload: {},
    });
  }
  alertsClient.setAlertLimitReached(parsedResults.truncated);

  return { state: {} };
}

export function getValidTimefieldSort(
  sortValues: Array<string | number | null> = []
): undefined | string {
  for (const sortValue of sortValues) {
    const sortDate = tryToParseAsDate(sortValue);
    if (sortDate) {
      return sortDate;
    }
  }
}

export function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}

export function getChecksum(params: OnlyEsqlQueryRuleParams) {
  return sha256.create().update(JSON.stringify(params));
}

export function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}
