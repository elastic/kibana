/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { aggTypeFilters } from 'ui/agg_types/filter';

export function initAggTypeFilter() {
  /**
   * If rollup index pattern, check its capabilities
   * and limit available aggregations based on that.
   */
  aggTypeFilters.addFilter((aggType, indexPattern) => {
    if (indexPattern.type !== 'rollup') {
      return true;
    }
    const aggName = aggType.name;
    const aggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;

    // Return doc_count (which is collected by default for rollup date histogram, histogram, and terms)
    // and the rest of the defined metrics from capabilities.
    return aggName === 'count' || Object.keys(aggs).includes(aggName);
  });
}
