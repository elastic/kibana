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

interface RandomSamplerOptionsBase {
  aggName?: string;
  seed?: number;
}

interface RandomSamplerOptionProbability extends RandomSamplerOptionsBase {
  probability: number;
}

function isRandomSamplerOptionProbability(arg: unknown): arg is RandomSamplerOptionProbability {
  return isPopulatedObject(arg, ['probability']);
}

interface RandomSamplerOptionTotalNumDocs extends RandomSamplerOptionsBase {
  totalNumDocs: number;
}

type RandomSamplerOptions = RandomSamplerOptionProbability | RandomSamplerOptionTotalNumDocs;

export function isValidProbability(d: unknown): d is number {
  return typeof d === 'number' && d > 0 && d < 0.5;
}

export type RandomSamplerWrapper = ReturnType<typeof createRandomSamplerWrapper>;
export const createRandomSamplerWrapper = (options: RandomSamplerOptions) => {
  let probability: number = 1;

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
