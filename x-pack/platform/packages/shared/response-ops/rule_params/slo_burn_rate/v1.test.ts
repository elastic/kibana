/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sloBurnRateParamsSchema } from './v1';

const paramsWithThreshold = (burnRateThreshold: number) => ({
  sloId: 'some-slo',
  windows: [
    {
      id: 'some-window',
      burnRateThreshold,
      maxBurnRateThreshold: null,
      longWindow: { value: 1, unit: 'h' },
      shortWindow: { value: 5, unit: 'm' },
      actionGroup: 'slo.burnRate.alert',
    },
  ],
});

describe('sloBurnRateParamsSchema', () => {
  it('accepts a positive burn rate threshold', () => {
    expect(() => sloBurnRateParamsSchema.validate(paramsWithThreshold(0.01))).not.toThrow();
  });

  it.each([0, -1])('rejects a burn rate threshold of %s', (burnRateThreshold) => {
    expect(() => sloBurnRateParamsSchema.validate(paramsWithThreshold(burnRateThreshold))).toThrow(
      '[windows.0.burnRateThreshold]: must be greater than 0'
    );
  });
});
