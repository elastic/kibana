/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersectionBy } from 'lodash';
import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ecsFieldMap, alertFieldMap } from '@kbn/alerts-as-data-utils';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { EsqlTable } from '../../../../common';
import { toEsQueryHits } from '../../../../common';
import type { OnlyEsqlQueryRuleParams } from '../types';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
  params: OnlyEsqlQueryRuleParams;
  spacePrefix: string;
  services: {
    logger: Logger;
    scopedClusterClient: IScopedClusterClient;
    share: SharePluginStart;
  };
  dateStart: string;
  dateEnd: string;
}

export async function fetchEsqlQuery({
  ruleId,
  alertLimit,
  params,
  services,
  spacePrefix,
  dateStart,
  dateEnd,
}: FetchEsqlQueryOpts) {
  const { logger, scopedClusterClient, share } = services;
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!;
  const esClient = scopedClusterClient.asCurrentUser;
  const query = getEsqlQuery(params, alertLimit, dateStart, dateEnd);

  logger.debug(() => `ES|QL query rule (${ruleId}) query: ${JSON.stringify(query)}`);

  let response: EsqlTable;
  try {
    response = await esClient.transport.request<EsqlTable>({
      method: 'POST',
      path: '/_query',
      body: query,
    });
  } catch (e) {
    if (e.message?.includes('verification_exception')) {
      throw createTaskRunError(e, TaskErrorSource.USER);
    }
    throw e;
  }

  const hits = toEsQueryHits(response);
  const sourceFields = getSourceFields(response);

  const link = generateLink(params, discoverLocator, dateStart, dateEnd, spacePrefix);

  return {
    link,
    numMatches: Number(response.values.length),
    parsedResults: parseAggregationResults({
      isCountAgg: true,
      isGroupAgg: false,
      esResult: {
        took: 0,
        timed_out: false,
        _shards: { failed: 0, successful: 0, total: 0 },
        hits,
      },
      resultLimit: alertLimit,
      sourceFieldsParams: sourceFields,
      generateSourceFieldsFromHits: true,
    }),
    index: null,
  };
}

export const getEsqlQuery = (
  params: OnlyEsqlQueryRuleParams,
  alertLimit: number | undefined,
  dateStart: string,
  dateEnd: string
) => {
  const rangeFilter: unknown[] = [
    {
      range: {
        [params.timeField]: {
          lte: dateEnd,
          gt: dateStart,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const query = {
    query: alertLimit ? `${params.esqlQuery.esql} | limit ${alertLimit}` : params.esqlQuery.esql,
    filter: {
      bool: {
        filter: rangeFilter,
      },
    },
  };
  return query;
};

export const getSourceFields = (results: EsqlTable) => {
  const resultFields = results.columns.map((c) => ({
    label: c.name,
    searchPath: c.name,
  }));
  const alertFields = Object.keys(alertFieldMap);
  const ecsFields = Object.keys(ecsFieldMap)
    // exclude the alert fields that we don't want to override
    .filter((key) => !alertFields.includes(key))
    .map((key) => ({ label: key, searchPath: key }));

  return intersectionBy(resultFields, ecsFields, 'label');
};

export function generateLink(
  params: OnlyEsqlQueryRuleParams,
  discoverLocator: LocatorPublic<DiscoverAppLocatorParams>,
  dateStart: string,
  dateEnd: string,
  spacePrefix: string
) {
  const redirectUrlParams: DiscoverAppLocatorParams = {
    timeRange: { from: dateStart, to: dateEnd },
    query: params.esqlQuery,
    isAlertResults: true,
  };

  // use `lzCompress` flag for making the link readable during debugging/testing
  // const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { lzCompress: false });
  const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { spaceId: spacePrefix });

  return redirectUrl;
}
