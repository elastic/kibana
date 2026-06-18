/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  MAX_BULK_ITEMS,
  type FindRulesResponse,
  type RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';

export interface FetchRulesByIdsParams {
  http: HttpStart;
  ids: string[];
}

const buildRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
  );

/**
 * Resolves rules by id via the find API and a KQL id filter.
 * Missing/deleted ids are omitted from the response without failing the request.
 */
export const fetchRulesByIds = async ({
  http,
  ids,
}: FetchRulesByIdsParams): Promise<RuleResponse[]> => {
  if (ids.length === 0) {
    return [];
  }

  const idChunks = chunk(ids, MAX_BULK_ITEMS);
  const chunkResponses = await Promise.all(
    idChunks.map((idChunk) =>
      http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, {
        query: {
          filter: buildRuleIdsFilter(idChunk),
          perPage: idChunk.length,
          page: 1,
        },
      })
    )
  );

  return chunkResponses.flatMap((response) => response.items);
};
