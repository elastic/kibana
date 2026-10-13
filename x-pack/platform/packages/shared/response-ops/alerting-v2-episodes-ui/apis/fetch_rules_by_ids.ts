/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  MAX_KQL_LENGTH,
  MAX_PER_PAGE,
  type FindRulesRequest,
  type FindRulesResponse,
  type RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '../constants';

export interface FetchRulesByIdsParams {
  http: HttpStart;
  ids: string[];
}

const buildRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
  );

const buildRuleIdBatches = (ids: string[]): string[][] => {
  const batches: string[][] = [];
  let currentBatch: string[] = [];

  for (const id of ids) {
    const candidateBatch = [...currentBatch, id];

    if (
      currentBatch.length >= MAX_PER_PAGE ||
      (currentBatch.length > 0 && buildRuleIdsFilter(candidateBatch).length > MAX_KQL_LENGTH)
    ) {
      batches.push(currentBatch);
      currentBatch = [id];
    } else {
      currentBatch = candidateBatch;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

/**
 * Resolves rules by id via the find API and KQL filters bounded by the API length limit.
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
    buildRuleIdBatches(idsToFetch).map((batch) => {
      const queryInput: FindRulesRequest = {
        filter: buildRuleIdsFilter(batch),
        per_page: batch.length,
        page: 1,
      };

      return http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, { query: queryInput });
    })
  );

  return responses.flatMap(({ items }) => items);
};
