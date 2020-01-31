/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
export function initAggTypeFieldFilter(aggTypeFieldFilters) {
=======
import { aggTypeFieldFilters } from 'ui/agg_types';

export function initAggTypeFieldFilter() {
>>>>>>> Remove nested ui/agg_types/* items and only use ui/agg_types
  /**
   * If rollup index pattern, check its capabilities
   * and limit available fields for a given aggType based on that.
   */
  aggTypeFieldFilters.addFilter((field, aggConfig) => {
    const indexPattern = aggConfig.getIndexPattern();
    if (!indexPattern || indexPattern.type !== 'rollup') {
      return true;
    }
    const aggName = aggConfig.type && aggConfig.type.name;
    const aggFields =
      indexPattern.typeMeta && indexPattern.typeMeta.aggs && indexPattern.typeMeta.aggs[aggName];
    return aggFields && aggFields[field.name];
  });
}
