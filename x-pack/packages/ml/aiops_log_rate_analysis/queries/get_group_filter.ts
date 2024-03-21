/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { type SignificantItemGroup, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';

// Transforms a list of significant items from a group in a query filter.
// Uses a `term` filter for single field value combinations.
// For fields with multiple values it creates a single `terms` filter that includes
// all values. This avoids queries not returning any results otherwise because
// separate `term` filter for multiple values for the same field would rule each other out.
export function getGroupFilter(
  significantItemGroup: SignificantItemGroup
): estypes.QueryDslQueryContainer[] {
  const groupKeywordFilter = Object.entries(
    significantItemGroup.group
      .filter((d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD)
      .reduce<Record<string, Array<string | number>>>((p, c) => {
        if (p[c.fieldName]) {
          p[c.fieldName].push(c.fieldValue);
        } else {
          p[c.fieldName] = [c.fieldValue];
        }
        return p;
      }, {})
  ).reduce<estypes.QueryDslQueryContainer[]>((p, [key, values]) => {
    p.push(values.length > 1 ? { terms: { [key]: values } } : { term: { [key]: values[0] } });
    return p;
  }, []);

  const groupLogPatternFilter = significantItemGroup.group
    .filter((d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN)
    .map((d) =>
      getCategoryQuery(d.fieldName, [
        {
          key: d.key,
          count: d.docCount,
          examples: [],
          regex: '',
        },
      ])
    );

  return [...groupKeywordFilter, ...groupLogPatternFilter];
}
