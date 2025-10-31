/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { getFirstKeyInObject } from '../object_utils';

/**
 * Validates that composite definition only have sources that are only terms and date_histogram
 * if composite is defined.
 * @param buckets
 */
export function hasValidComposite(buckets: estypes.AggregationsAggregationContainer) {
  if (
    isPopulatedObject(buckets, ['composite']) &&
    isPopulatedObject(buckets.composite, ['sources']) &&
    Array.isArray(buckets.composite.sources)
  ) {
    const sources = buckets.composite.sources;
    return !sources.some((source) => {
      const sourceName = getFirstKeyInObject(source);
      if (sourceName !== undefined && isPopulatedObject(source[sourceName])) {
        const sourceTypes = Object.keys(source[sourceName]);
        return (
          sourceTypes.length === 1 &&
          sourceTypes[0] !== 'date_histogram' &&
          sourceTypes[0] !== 'terms'
        );
      }
      return false;
    });
  }
  return true;
}
