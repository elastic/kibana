/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRandomSamplerWrapper } from './random_sampler_wrapper';

describe('createRandomSamplerWrapper', () => {
  const testAggs = {
    bytes_stats: {
      stats: { field: 'bytes' },
    },
  };

  const getWrappedTestAggs = (probability: number) => ({
    sample: {
      random_sampler: {
        probability,
      },
      aggs: testAggs,
    },
  });

  it('returns the un-sampled aggregation as-is for a probability of 1', () => {
    expect(createRandomSamplerWrapper({ probability: 1 }).wrap(testAggs)).toEqual(testAggs);
  });

  it('returns wrapped random sampler aggregation for probability of 0.5', () => {
    expect(createRandomSamplerWrapper({ probability: 0.5 }).wrap(testAggs)).toEqual(
      getWrappedTestAggs(0.5)
    );
  });

  it('returns wrapped random sampler aggregation for probability of 0.01', () => {
    expect(createRandomSamplerWrapper({ probability: 0.01 }).wrap(testAggs)).toEqual(
      getWrappedTestAggs(0.01)
    );
  });

  it('returns probability of 1 and does not wrap when used for 10 docs', () => {
    const randomSamplerWrapper = createRandomSamplerWrapper({ totalNumDocs: 10 });
    expect(randomSamplerWrapper.probability).toBe(1);
    expect(randomSamplerWrapper.wrap(testAggs)).toEqual(testAggs);
  });

  it('returns probability of 0.01 and does wrap when used for 5000000 docs', () => {
    const randomSamplerWrapper = createRandomSamplerWrapper({ totalNumDocs: 5000000 });
    expect(randomSamplerWrapper.probability).toBe(0.01);
    expect(randomSamplerWrapper.wrap(testAggs)).toEqual(getWrappedTestAggs(0.01));
  });
});
