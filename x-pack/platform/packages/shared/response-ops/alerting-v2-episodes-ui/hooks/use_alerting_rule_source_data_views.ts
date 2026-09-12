/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { getEsqlDataView } from '@kbn/discover-utils';
import { getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

type Rule = FindRulesResponse['items'][number];

export interface UseAlertingRuleSourceDataViewsOptions {
  /** Cache of rules keyed by rule id (e.g. from `useAlertingRulesCache`). */
  rules: Record<string, Rule>;
  dataViews: DataViewsContract;
  http: HttpStart;
}

const EMPTY_DATA_VIEWS_BY_RULE = new Map<string, DataView>();

/**
 * Resolves the source data view for each rule from its root ES|QL query, so grouping values across
 * multiple rules (e.g. in the episodes list) can be formatted with the correct field metadata via
 * `fieldFormats`. Data views are cached by query string, so rules sharing a query resolve only once.
 */
export const useAlertingRuleSourceDataViews = ({
  rules,
  dataViews,
  http,
}: UseAlertingRuleSourceDataViewsOptions): Map<string, DataView> => {
  const queryCacheRef = useRef<Map<string, DataView>>(new Map());

  const dataViewsByRule = useAsync(async () => {
    const queryCache = queryCacheRef.current;

    // Map each rule to its root ES|QL query, then resolve each *unique* query once.
    const queryByRule = new Map<string, string>();
    for (const [ruleId, rule] of Object.entries(rules)) {
      const query = rule.query ? getRootEsqlQuery(rule.query) : undefined;
      if (query) {
        queryByRule.set(ruleId, query);
      }
    }

    const uniqueQueries = [...new Set(queryByRule.values())];
    await Promise.all(
      uniqueQueries.map(async (query) => {
        if (queryCache.has(query)) {
          return;
        }
        try {
          queryCache.set(
            query,
            await getEsqlDataView({ esql: query }, undefined, { dataViews, http })
          );
        } catch {
          // Skip queries whose data view cannot be resolved; the untyped fallback renders instead.
        }
      })
    );

    const next = new Map<string, DataView>();
    for (const [ruleId, query] of queryByRule) {
      const dataView = queryCache.get(query);
      if (dataView) {
        next.set(ruleId, dataView);
      }
    }

    return next;
  }, [rules, dataViews, http]);

  return dataViewsByRule.value ?? EMPTY_DATA_VIEWS_BY_RULE;
};
