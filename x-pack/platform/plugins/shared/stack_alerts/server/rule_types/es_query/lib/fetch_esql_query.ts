/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersectionBy } from 'lodash';
import {
  isPerRowAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/common';
import type { PublicRuleResultService } from '@kbn/alerting-plugin/server/types';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ecsFieldMap, alertFieldMap } from '@kbn/alerts-as-data-utils';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { EsqlTable } from '../../../../common';
import { getEsqlQueryHits } from '../../../../common';
import type { OnlyEsqlQueryRuleParams } from '../types';
import { i18n } from '@kbn/i18n';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
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

  const sourceFields = getSourceFields(response);
  const isGroupAgg = isPerRowAggregation(params.groupBy);
  const { results, duplicateAlertIds } = getEsqlQueryHits(
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
    const warning = i18n.translate('xpack.stackAlerts.esQuery.isPartialWarning', {
      defaultMessage:
        'The query returned partial results. Some clusters may have been skipped due to timeouts or other issues.',
    });
    const hasResults = results.esResult?.hits?.hits?.length > 0;

    if (!isGroupAgg && !hasResults) {
      // If this is not a grouped query (Alert per row) and there are no results, we fail the run
      throw createTaskRunError(new Error(warning), TaskErrorSource.FRAMEWORK);
    }

    if (isGroupAgg || (!isGroupAgg && hasResults)) {
      // For grouped queries (Alert per row) no matter if there are results or not.
      // And the non-grouped queries (Alert if matches are found) if there are results,
      // we show a warning instead of throwing an error.
      ruleResultService.addLastRunWarning(warning);
      ruleResultService.setLastRunOutcomeMessage(warning);
    }
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
