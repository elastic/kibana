/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getSampleProbability } from './get_sample_probability';

const DEFAULT_AGG_NAME = 'sample';

interface RandomSamplerOptionsBase {
  aggName?: string;
  seed?: number;
}

interface RandomSamplerOptionProbability extends RandomSamplerOptionsBase {
  probability: number;
}

/**
 * Type guard for RandomSamplerOptionProbability
 */
function isRandomSamplerOptionProbability(arg: unknown): arg is RandomSamplerOptionProbability {
  return isPopulatedObject(arg, ['probability']);
}

interface RandomSamplerOptionTotalNumDocs extends RandomSamplerOptionsBase {
  totalNumDocs: number;
}

type RandomSamplerOptions = RandomSamplerOptionProbability | RandomSamplerOptionTotalNumDocs;

/**
 * Check if a given probability is suitable for the `random_sampler` aggregation.
 * @param {unknown} p The probability to be tested.
 * @returns {boolean}
 */
export function isValidProbability(p: unknown): p is number {
  return typeof p === 'number' && p > 0 && p <= 0.5;
}

/**
 * The return type of the `createRandomSamplerWrapper` factory.
 */
export type RandomSamplerWrapper = ReturnType<typeof createRandomSamplerWrapper>;

/**
 * Factory to create the random sampler wrapper utility.
 * @param {RandomSamplerOptions} options RandomSamplerOptions
 * @returns {RandomSamplerWrapper} random sampler wrapper utility
 */
export const createRandomSamplerWrapper = (options: RandomSamplerOptions) => {
  const probability = isRandomSamplerOptionProbability(options)
    ? options.probability
    : getSampleProbability(options.totalNumDocs);

  const aggName = options.aggName ?? DEFAULT_AGG_NAME;

  const wrap = <T extends Record<string, estypes.AggregationsAggregationContainer>>(
    aggs: T
  ): T | Record<string, estypes.AggregationsAggregationContainer> => {
    if (!isValidProbability(probability)) {
      return aggs;
    }

    return {
      [aggName]: {
        random_sampler: {
          probability,
          ...(options.seed ? { seed: options.seed } : {}),
        },
        aggs,
      },
    } as Record<string, estypes.AggregationsAggregationContainer>;
  };

  const unwrap = <T extends Exclude<estypes.SearchResponse['aggregations'], undefined>>(
    responseAggs: T
  ) => (!isValidProbability(probability) ? responseAggs : get(responseAggs, [aggName]));

  return { wrap, unwrap, probability };
};
