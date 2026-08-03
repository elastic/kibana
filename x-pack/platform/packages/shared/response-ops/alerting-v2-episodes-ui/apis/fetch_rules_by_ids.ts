/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { FindRulesResponse, RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '../constants';

export interface FetchRulesByIdsParams {
  http: HttpStart;
  ids: string[];
}

const V1_RULES_FIND_API_PATH = '/api/alerting/rules/_find' as const;
const V1_RULE_SO_TYPE = 'alert' as const;

const buildRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
  );

/**
 * The v1 `_find` API passes the KQL filter directly to the saved-objects
 * client, which requires the SO-type prefix on both the field name and
 * the value (e.g. `alert.id: "alert:rule-123"`).
 */
const buildV1RuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(
      ids.map((id) =>
        nodeBuilder.is(
          `${V1_RULE_SO_TYPE}.id`,
          nodeTypes.literal.buildNode(`${V1_RULE_SO_TYPE}:${id}`, true)
        )
      )
    )
  );

interface V1FindRulesResponse {
  data: Array<{ id: string; name: string; [key: string]: unknown }>;
}

/**
 * Adapts a v1 rule response into the minimal `RuleResponse` shape consumed by
 * the rules cache (only `id` and `metadata.name` are used by the table).
 */
const adaptV1Rule = (v1Rule: V1FindRulesResponse['data'][number]): RuleResponse =>
  ({
    id: v1Rule.id,
    metadata: { name: v1Rule.name },
  } as unknown as RuleResponse);

/**
 * Resolves rules by id via the v2 find API, falling back to the v1 alerting
 * find API for any IDs not found. This lets the rules cache supply names for
 * both v2 and classic (v1) rules without carrying `_v1_rule_name` on rows.
 */
export const fetchRulesByIds = async ({
  http,
  ids,
}: FetchRulesByIdsParams): Promise<RuleResponse[]> => {
  const idsToFetch = take(ids, ALERT_EPISODES_LIST_PAGE_SIZE);
  if (idsToFetch.length === 0) {
    return [];
  }

  const v2Response = await http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, {
    query: {
      filter: buildRuleIdsFilter(idsToFetch),
      perPage: ALERT_EPISODES_LIST_PAGE_SIZE,
      page: 1,
    },
  });

  const v2Rules = v2Response.items;
  const resolvedIds = new Set(v2Rules.map((rule) => rule.id));
  const missingIds = idsToFetch.filter((id) => !resolvedIds.has(id));

  if (missingIds.length === 0) {
    return v2Rules;
  }

  try {
    const v1Response = await http.get<V1FindRulesResponse>(V1_RULES_FIND_API_PATH, {
      query: {
        filter: buildV1RuleIdsFilter(missingIds),
        per_page: missingIds.length,
        page: 1,
      },
    });
    return [...v2Rules, ...v1Response.data.map(adaptV1Rule)];
  } catch {
    return v2Rules;
  }
};
