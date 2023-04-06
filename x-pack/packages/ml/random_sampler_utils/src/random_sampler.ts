/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { getSampleProbability } from './get_sample_probability';

const DEFAULT_AGG_NAME = 'sample';

// For the technical preview of Explain Log Rate Spikes we use a hard coded seed.
// In future versions we might use a user specific seed or let the user costumise it.
export const RANDOM_SAMPLER_SEED = 3867412;

interface RandomSamplerOptionsBase {
  aggName?: string;
  seed?: number;
}

interface RandomSamplerOptionProbability extends RandomSamplerOptionsBase {
  probability: number | null;
}

function isRandomSamplerOptionProbability(arg: unknown): arg is RandomSamplerOptionProbability {
  return isPopulatedObject(arg, ['probability']);
}

interface RandomSamplerOptionTotalNumDocs extends RandomSamplerOptionsBase {
  totalNumDocs: number;
}

type RandomSamplerOptions = RandomSamplerOptionProbability | RandomSamplerOptionTotalNumDocs;

function isValidProbability(d: unknown): d is number {
  return typeof d === 'number' && d > 0 && d <= 1;
}

export type RandomSampler = ReturnType<typeof randomSampler>;
export const randomSampler = (options: RandomSamplerOptions) => {
  let probability: number | null = 1;

  if (isRandomSamplerOptionProbability(options)) {
    probability = options.probability;
  } else {
    probability = getSampleProbability(options.totalNumDocs);
  }

  const aggName = options.aggName ?? DEFAULT_AGG_NAME;

  const wrap = <T extends Record<string, estypes.AggregationsAggregationContainer>>(
    aggs: T
  ): T | Record<string, estypes.AggregationsAggregationContainer> => {
    if (!isValidProbability(probability)) {
      return aggs;
    }

    return {
      [aggName]: {
        // @ts-expect-error `random_sampler` is not yet part of `AggregationsAggregationContainer`
        random_sampler: {
          probability,
          seed: options.seed ?? RANDOM_SAMPLER_SEED,
        },
        aggs,
      },
    } as Record<string, estypes.AggregationsAggregationContainer>;
  };

  const unwrap = <T extends estypes.SearchResponse['aggregations']>(responseAggs: T) => {
    if (responseAggs !== undefined) {
      return !isValidProbability(probability) ? responseAggs : get(responseAggs, [aggName]);
    }
  };

  return { wrap, unwrap };
};
