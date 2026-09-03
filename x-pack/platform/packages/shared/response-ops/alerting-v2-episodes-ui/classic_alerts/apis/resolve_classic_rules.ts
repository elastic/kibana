/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';

const CLASSIC_RULES_FIND_API_PATH = '/internal/alerting/rules/_find' as const;
const CLASSIC_RULE_SO_TYPE = 'alert' as const;

const buildClassicRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(
      ids.map((id) =>
        nodeBuilder.is(
          `${CLASSIC_RULE_SO_TYPE}.id`,
          nodeTypes.literal.buildNode(`${CLASSIC_RULE_SO_TYPE}:${id}`, true)
        )
      )
    )
  );

interface ClassicFindRulesResponse {
  data: Array<{ id: string; name: string; [key: string]: unknown }>;
}

const adaptClassicRule = (rule: ClassicFindRulesResponse['data'][number]): RuleResponse =>
  ({
    id: rule.id,
    metadata: { name: rule.name },
  } as unknown as RuleResponse);

export interface ResolveClassicRulesParams {
  ids: string[];
  services: { http: HttpStart };
}

export const resolveClassicRules = async ({
  ids,
  services: { http },
}: ResolveClassicRulesParams): Promise<RuleResponse[]> => {
  if (ids.length === 0) {
    return [];
  }

  try {
    const response = await http.post<ClassicFindRulesResponse>(CLASSIC_RULES_FIND_API_PATH, {
      body: JSON.stringify({
        filter: buildClassicRuleIdsFilter(ids),
        per_page: ids.length,
        page: 1,
      }),
    });
    return response.data.map(adaptClassicRule);
  } catch {
    return [];
  }
};
