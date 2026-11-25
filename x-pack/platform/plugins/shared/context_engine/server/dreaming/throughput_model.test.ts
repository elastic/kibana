/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  modelTraceDreamingThroughput,
  PARALLEL_MAX_CONCURRENCY,
  PARALLEL_MAX_FAN_OUT,
  STEP_SIZE_TOKEN_CEILING,
} from './throughput_model';

const defaults = {
  concurrency: 4,
  timeoutMinutes: 30,
  callLatencySeconds: 90,
  batchTokens: 50_000,
  maxTokens: 600_000,
};

describe('modelTraceDreamingThroughput', () => {
  it('models the shipped defaults as 12 batches in 3 waves', () => {
    const result = modelTraceDreamingThroughput(defaults);
    expect(result).toMatchObject({
      batches: 12,
      waves: 3,
      estimatedSeconds: 270,
      fitsTimeout: true,
      fitsStepSize: true,
      tokensPerRun: 600_000,
    });
  });

  it('processes nothing when the run would time out', () => {
    const result = modelTraceDreamingThroughput({ ...defaults, callLatencySeconds: 600 });
    expect(result.fitsTimeout).toBe(false);
    expect(result.tokensPerRun).toBe(0);
  });

  it('caps fan-out and concurrency at the engine limits', () => {
    const result = modelTraceDreamingThroughput({
      ...defaults,
      concurrency: 50,
      maxTokens: 10_000_000,
    });
    expect(result.batches).toBe(PARALLEL_MAX_FAN_OUT);
    expect(result.waves).toBe(Math.ceil(PARALLEL_MAX_FAN_OUT / PARALLEL_MAX_CONCURRENCY));
    expect(result.fitsStepSize).toBe(false);
  });

  it('flags a connector rate the batches exceed', () => {
    const result = modelTraceDreamingThroughput({ ...defaults, connectorTokensPerMinute: 100_000 });
    expect(result.tokensPerMinute).toBeCloseTo(133_333, -2);
    expect(result.withinConnectorRate).toBe(false);
  });

  it('limits the recommended read to the step size when time and rate allow more', () => {
    expect(modelTraceDreamingThroughput(defaults).recommendedMaxTokens).toBe(
      STEP_SIZE_TOKEN_CEILING
    );
  });

  it('limits the recommended read to the connector rate over the usable timeout', () => {
    const result = modelTraceDreamingThroughput({
      ...defaults,
      connectorTokensPerMinute: 20_000,
    });
    // 20k tokens/min x 24 usable minutes = 480k tokens, which is 9 whole batches.
    expect(result.recommendedMaxTokens).toBe(450_000);
  });

  it('limits the recommended read to the timeout when calls are slow', () => {
    const result = modelTraceDreamingThroughput({ ...defaults, callLatencySeconds: 480 });
    // 1440 usable seconds fit 3 waves of 4 batches.
    expect(result.recommendedMaxTokens).toBe(600_000);
  });
});
