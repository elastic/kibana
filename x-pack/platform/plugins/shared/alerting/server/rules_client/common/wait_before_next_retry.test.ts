/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExponentialDelayMultiplier,
  randomDelayMs,
  RETRY_IF_CONFLICTS_DELAY,
  RETRY_IF_CONFLICTS_ATTEMPTS,
  waitBeforeNextRetry,
} from './wait_before_next_retry';

describe('waitBeforeNextRetry', () => {
  const randomDelayPart = 0.1;

  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayPart);
    jest.spyOn(window, 'setTimeout');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  for (let i = 1; i <= RETRY_IF_CONFLICTS_ATTEMPTS; i++) {
    it(`should set timout for ${i} tries`, async () => {
      await waitBeforeNextRetry(i);
      expect(setTimeout).toBeCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        RETRY_IF_CONFLICTS_DELAY * getExponentialDelayMultiplier(i) + randomDelayMs
      );
    });
  }
});
