/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OnlyEsQueryRuleParams } from './types';
import { EsQueryRuleParams } from './rule_type_params';

export function isEsQueryRule(searchType: EsQueryRuleParams['searchType']) {
  return searchType === 'esQuery';
}

export function isSearchSourceRule(searchType: EsQueryRuleParams['searchType']) {
  return searchType === 'searchSource';
}

export function isEsqlQueryRule(searchType: EsQueryRuleParams['searchType']) {
  return searchType === 'esqlQuery';
}

export function getParsedQuery(queryParams: OnlyEsQueryRuleParams) {
  const { esQuery } = queryParams;

  let parsedQuery;
  try {
    parsedQuery = JSON.parse(esQuery);
  } catch (err) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  if (parsedQuery && !parsedQuery.query) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  return parsedQuery;
}

function getInvalidQueryError(query: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidQueryErrorMessage', {
    defaultMessage: 'invalid query specified: "{query}" - query must be JSON',
    values: {
      query,
    },
  });
}

export function checkForShardFailures(searchResult: SearchResponse<unknown>): string | undefined {
  const anyShardsFailed = searchResult?._shards?.failed ?? 0;
  if (anyShardsFailed > 0) {
    const errorMessage =
      searchResult?._shards?.failures?.[0]?.reason?.reason ||
      'Search returned partial results due to shard failures.';
    return errorMessage;
  }

  const anyClustersSkipped = searchResult?._clusters?.skipped ?? 0;
  if (anyClustersSkipped) {
    const details = searchResult?._clusters?.details ?? {};
    for (const detail of Object.values(details)) {
      const errorMessage =
        detail?.failures?.[0]?.reason?.caused_by?.reason ||
        'Search returned partial results due to skipped cluster errors.';
      return errorMessage;
    }
  }
}
