/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPerRowAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/common';
import type { PublicRuleResultService } from '@kbn/alerting-plugin/server/types';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';
import { hasStartEndParams, appendLimitToQuery } from '@kbn/esql-utils';
import type { EsqlTable } from '../../../../common';
import { getEsqlQueryHits } from '../../../../common';
import type { OnlyEsqlQueryRuleParams, EsQuerySourceFields } from '../types';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number;
  params: OnlyEsqlQueryRuleParams;
  spacePrefix: string;
  services: {
    logger: Logger;
    scopedClusterClient: IScopedClusterClient;
    share: SharePluginStart;
    ruleResultService?: PublicRuleResultService;
  };
  dateStart: string;
  dateEnd: string;
  sourceFields: EsQuerySourceFields;
}

export async function fetchEsqlQuery({
  ruleId,
  alertLimit,
  params,
  services,
  spacePrefix,
  dateStart,
  dateEnd,
  sourceFields,
}: FetchEsqlQueryOpts) {
  const { logger, scopedClusterClient, share, ruleResultService } = services;
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

  const isGroupAgg = isPerRowAggregation(params.groupBy);
  const { results, duplicateAlertIds } = await getEsqlQueryHits(
    response,
    params.esqlQuery.esql,
    isGroupAgg
  );

  if (ruleResultService && duplicateAlertIds && duplicateAlertIds.size > 0) {
    const warning = `The query returned multiple rows with the same alert ID. There are duplicate results for alert IDs: ${Array.from(
      duplicateAlertIds
    ).join('; ')}`;
    ruleResultService.addLastRunWarning(warning);
    ruleResultService.setLastRunOutcomeMessage(warning);
  }

  const isPartial = response.is_partial ?? false;

  if (ruleResultService && isPartial) {
    const warning = getPartialResultsWarning(response);
    ruleResultService.addLastRunWarning(warning);
    ruleResultService.setLastRunOutcomeMessage(warning);
  }

  const link = generateLink(params, discoverLocator, dateStart, dateEnd, spacePrefix);

  return {
    link,
    parsedResults: parseAggregationResults({
      ...results,
      resultLimit: alertLimit,
      sourceFieldsParams: sourceFields,
      generateSourceFieldsFromHits: true,
    }),
    index: null,
  };
}

export const getEsqlQuery = (
  params: OnlyEsqlQueryRuleParams,
  alertLimit: number,
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
    query: appendLimitToQuery(params.esqlQuery.esql, alertLimit),
    filter: {
      bool: {
        filter: rangeFilter,
      },
    },
    ...(hasStartEndParams(params.esqlQuery.esql)
      ? { params: [{ _tstart: dateStart }, { _tend: dateEnd }] }
      : {}),
  };
  return query;
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

function getPartialResultsWarning(response: EsqlTable) {
  const clusters = response?._clusters?.details ?? {};
  const shardFailures: EsqlEsqlShardFailure[] = [];
  for (const cluster of Object.keys(clusters)) {
    const failures = clusters[cluster]?.failures ?? [];

    if (failures.length > 0) {
      shardFailures.push(...failures);
    }
  }

  return i18n.translate('xpack.stackAlerts.esQuery.partialResultsWarning', {
    defaultMessage:
      shardFailures.length > 0
        ? 'The query returned partial results. Some clusters may have been skipped due to timeouts or other issues. Failures: {failures}'
        : 'The query returned partial results. Some clusters may have been skipped due to timeouts or other issues.',
    values: { failures: JSON.stringify(shardFailures) },
  });
}
