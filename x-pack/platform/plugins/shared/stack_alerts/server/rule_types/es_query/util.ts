/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { set } from '@kbn/safer-lodash-set';
import { OnlyEsQueryRuleParams } from './types';

export interface GroupByFields {
  [x: string]: unknown;
}

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

export const unflattenObject = <T extends object = GroupByFields>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

export const getGroupByObject = (
  groupBy: string | string[] | undefined,
  resultGroupSet: Set<string>
): Record<string, object> => {
  const groupByKeysObjectMapping: Record<string, object> = {};
  if (groupBy) {
    resultGroupSet.forEach((groupSet) => {
      const groupSetKeys = groupSet.split(',');
      groupByKeysObjectMapping[groupSet] = unflattenObject(
        Array.isArray(groupBy)
          ? groupBy.reduce((result, group, index) => {
              return { ...result, [group]: groupSetKeys[index]?.trim() };
            }, {})
          : { [groupBy]: groupSet }
      );
    });
  }
  return groupByKeysObjectMapping;
};
