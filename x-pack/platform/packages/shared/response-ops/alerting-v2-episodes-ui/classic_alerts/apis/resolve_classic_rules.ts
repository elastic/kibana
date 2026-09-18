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

interface ClassicRule {
  id: string;
  name: string;
  tags?: string[];
  enabled?: boolean;
  schedule?: { interval?: string };
  params?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClassicFindRulesResponse {
  data: ClassicRule[];
}

const extractGroupingFields = (params: Record<string, unknown> | undefined): string[] => {
  const value = params?.termField ?? params?.groupBy;
  return (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
};

const adaptClassicRule = (rule: ClassicRule): RuleResponse => {
  const groupingFields = extractGroupingFields(rule.params);
  return {
    id: rule.id,
    enabled: rule.enabled ?? false,
    metadata: {
      name: rule.name,
      tags: rule.tags ?? [],
    },
    schedule: rule.schedule?.interval ? { every: rule.schedule.interval } : undefined,
    grouping: groupingFields.length > 0 ? { fields: groupingFields } : undefined,
    created_by: rule.created_by ?? null,
    updated_by: rule.updated_by ?? null,
    created_at: rule.created_at ?? '',
    updated_at: rule.updated_at ?? '',
  } as unknown as RuleResponse;
};

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

  const response = await http.post<ClassicFindRulesResponse>(CLASSIC_RULES_FIND_API_PATH, {
    body: JSON.stringify({
      filter: buildClassicRuleIdsFilter(ids),
      per_page: ids.length,
      page: 1,
    }),
  });
  return response.data.map(adaptClassicRule);
};
