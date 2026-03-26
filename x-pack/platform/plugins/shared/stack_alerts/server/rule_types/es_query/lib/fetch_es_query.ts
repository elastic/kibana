/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  BUCKET_SELECTOR_FIELD,
  buildAggregation,
  isCountAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/common';
import { isGroupAggregation } from '@kbn/triggers-actions-ui-plugin/common';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { PublicRuleResultService } from '@kbn/alerting-plugin/server/types';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { FilterStateStore, buildCustomFilter } from '@kbn/es-query';
import { getComparatorScript } from '../../../../common';
import type { OnlyEsQueryRuleParams, EsQuerySourceFields } from '../types';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { getParsedQuery, checkForShardFailures } from '../util';

export interface FetchEsQueryOpts {
  ruleId: string;
  name: string;
  params: OnlyEsQueryRuleParams;
  timestamp: string | undefined;
  spacePrefix: string;
  services: {
    share: SharePluginStart;
    scopedClusterClient: IScopedClusterClient;
    logger: Logger;
    ruleResultService?: PublicRuleResultService;
  };
  alertLimit: number;
  dateStart: string;
  dateEnd: string;
  sourceFields: EsQuerySourceFields;
}

/**
 * Fetching matching documents for a given rule from elasticsearch by a given index and query
 */
export async function fetchEsQuery({
  ruleId,
  name,
  params,
  spacePrefix,
  timestamp,
  services,
  alertLimit,
  dateStart,
  dateEnd,
  sourceFields,
}: FetchEsQueryOpts) {
  const { scopedClusterClient, logger, ruleResultService, share } = services;
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!;
  const esClient = scopedClusterClient.asCurrentUser;
  const isGroupAgg = isGroupAggregation(params.termField);
  const isCountAgg = isCountAggregation(params.aggType);
  const { query, fields, runtime_mappings, _source } = getParsedQuery(params);

  const filter =
    timestamp && params.excludeHitsFromPreviousRun
      ? {
          bool: {
            filter: [
              query,
              {
                bool: {
                  must_not: [
                    {
                      bool: {
                        filter: [
                          {
                            range: {
                              [params.timeField]: {
                                lte: timestamp,
                                format: 'strict_date_optional_time',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      : query;

  const sortedQuery = buildSortedEventsQuery({
    index: params.index,
    from: dateStart,
    to: dateEnd,
    filter,
    size: isGroupAgg ? 0 : params.size,
    sortOrder: 'desc',
    searchAfterSortId: undefined,
    timeField: params.timeField,
    track_total_hits: true,
    fields,
    runtime_mappings,
    _source,
    aggs: buildAggregation({
      aggType: params.aggType,
      aggField: params.aggField,
      termField: params.termField,
      termSize: params.termSize,
      condition: {
        resultLimit: alertLimit,
        conditionScript: getComparatorScript(
          params.thresholdComparator,
          params.threshold,
          BUCKET_SELECTOR_FIELD
        ),
      },
      ...(isGroupAgg ? { topHitsSize: params.size } : {}),
      loggerCb: (message: string) => logger.warn(message),
    }),
  });

  logger.debug(
    () => `es query rule ${ES_QUERY_ID}:${ruleId} "${name}" query - ${JSON.stringify(sortedQuery)}`
  );

  const { body: searchResult } = await esClient.search(sortedQuery, { meta: true });

  logger.debug(
    () =>
      ` es query rule ${ES_QUERY_ID}:${ruleId} "${name}" result - ${JSON.stringify(searchResult)}`
  );

  // result against CCS indices will return success response with errors nested within
  // the _shards or _clusters field; look for these errors and bubble them up
  const anyShardFailures = checkForShardFailures(searchResult);
  if (anyShardFailures && ruleResultService) {
    ruleResultService.addLastRunWarning(anyShardFailures);
    ruleResultService.setLastRunOutcomeMessage(anyShardFailures);
  }

  const link = generateLink(params, filter, discoverLocator, dateStart, dateEnd, spacePrefix);

  return {
    parsedResults: parseAggregationResults({
      isCountAgg,
      isGroupAgg,
      esResult: searchResult,
      resultLimit: alertLimit,
      sourceFieldsParams: sourceFields,
      generateSourceFieldsFromHits: true,
      termField: params.termField,
    }),
    link,
    index: params.index,
  };
}

export function generateLink(
  params: OnlyEsQueryRuleParams,
  rawFilter: Record<string, unknown>,
  discoverLocator: LocatorPublic<DiscoverAppLocatorParams>,
  dateStart: string,
  dateEnd: string,
  spacePrefix: string
) {
  const dataViewId = 'es_query_rule_adhoc_data_view';
  const filter = buildCustomFilter(
    dataViewId,
    rawFilter,
    false,
    false,
    'Rule query DSL',
    FilterStateStore.APP_STATE
  );
  const redirectUrlParams: DiscoverAppLocatorParams = {
    dataViewSpec: {
      id: dataViewId,
      title: params.index.join(','),
      timeFieldName: params.timeField,
    },
    filters: [filter],
    timeRange: { from: dateStart, to: dateEnd },
    isAlertResults: true,
  };

  // use `lzCompress` flag for making the link readable during debugging/testing
  // const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { lzCompress: false });
  const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { spaceId: spacePrefix });

  return redirectUrl;
}
