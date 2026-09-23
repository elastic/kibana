/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';
import type { FindRulesRequest, FindRulesResponse, RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODES_LIST_PAGE_SIZE, RULES_RESOLUTION_BATCH_SIZE } from '../constants';

export interface FetchRulesByIdsParams {
  http: HttpStart;
  ids: string[];
}

const buildRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
  );

const KQL_OR_SEPARATOR_LENGTH = ' OR '.length;
const KQL_GROUP_WRAPPER_LENGTH = '()'.length;

/**
 * Packs ids into batches bounded by the page size and by the `filter` length, which
 * a full page of ids exceeds on its own once each id becomes an `id: "..."` clause.
 */
const batchRuleIds = (ids: string[]): string[][] => {
  const batches: string[][] = [];
  let batch: string[] = [];
  let length = KQL_GROUP_WRAPPER_LENGTH;

  for (const id of ids) {
    const clauseLength = buildRuleIdsFilter([id]).length + KQL_OR_SEPARATOR_LENGTH;
    const isFull =
      batch.length === RULES_RESOLUTION_BATCH_SIZE || length + clauseLength > MAX_KQL_LENGTH;

    if (batch.length > 0 && isFull) {
      batches.push(batch);
      batch = [];
      length = KQL_GROUP_WRAPPER_LENGTH;
    }

    batch.push(id);
    length += clauseLength;
  }

  if (batch.length > 0) {
    batches.push(batch);
  }

  return batches;
};

/**
 * Resolves rules by id via the find API and a KQL id filter, in batches.
 * Missing/deleted ids are omitted from the response without failing the request.
 */
export const fetchRulesByIds = async ({
  http,
  ids,
}: FetchRulesByIdsParams): Promise<RuleResponse[]> => {
  const idsToFetch = take(ids, ALERT_EPISODES_LIST_PAGE_SIZE);
  if (idsToFetch.length === 0) {
    return [];
  }

  const responses = await Promise.all(
    batchRuleIds(idsToFetch).map((batch) => {
      const queryInput: FindRulesRequest = {
        filter: buildRuleIdsFilter(batch),
        per_page: RULES_RESOLUTION_BATCH_SIZE,
        page: 1,
      };

      return http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, { query: queryInput });
    })
  );

  return responses.flatMap(({ items }) => items);
};
