/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Type guard to validate multi bucket aggregate format.
 *
 * @template TBucket
 * @param {unknown} arg - The item to be checked.
 * @returns {arg is estypes.AggregationsMultiBucketAggregateBase<TBucket>}
 */
export const isMultiBucketAggregate = <TBucket = unknown>(
  arg: unknown
): arg is estypes.AggregationsMultiBucketAggregateBase<TBucket> => {
  return isPopulatedObject(arg, ['buckets']);
};
