/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { FindRulesResponse } from '@kbn/alerting-v2-plugin/public/services/rules_api';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import useAsync from 'react-use/lib/useAsync';

export interface UseAlertingRulesIndexOptions {
  ruleIds: string[];
  services: {
    http: HttpStart;
  };
}

type Rule = FindRulesResponse['items'][number];

/**
 * Provides a rules index by id, fetching uncached rules
 * with the minimum number of bulk requests possible
 */
export const useAlertingRulesIndex = ({ ruleIds, services }: UseAlertingRulesIndexOptions) => {
  const cacheRef = useRef<Record<string, Rule>>({});

  const { loading, error } = useAsync(async () => {
    const uncachedIds = ruleIds.filter((id) => !cacheRef.current[id]);

    if (uncachedIds.length === 0) {
      return;
    }

    const rulesResponse = await services.http.get<FindRulesResponse>(
      `${ALERTING_V2_RULE_API_PATH}/_bulk`,
      {
        query: { ids: uncachedIds },
      }
    );
    rulesResponse.items.forEach((rule) => {
      cacheRef.current[rule.id] = rule;
    });
  }, [ruleIds, services.http]);

  return {
    rulesIndex: cacheRef.current,
    loading,
    error,
  };
};
