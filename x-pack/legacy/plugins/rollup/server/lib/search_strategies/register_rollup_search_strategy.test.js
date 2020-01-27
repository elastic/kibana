/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRollupSearchStrategy } from './register_rollup_search_strategy';

describe('Register Rollup Search Strategy', () => {
  let kbnServer;
  let metrics;

  beforeEach(() => {
    const afterPluginsInit = jest.fn(callback => callback());

    kbnServer = {
      afterPluginsInit,
    };

    metrics = {
      addSearchStrategy: jest.fn().mockName('addSearchStrategy'),
      AbstractSearchRequest: jest.fn().mockName('AbstractSearchRequest'),
      AbstractSearchStrategy: jest.fn().mockName('AbstractSearchStrategy'),
      DefaultSearchCapabilities: jest.fn().mockName('DefaultSearchCapabilities'),
    };
  });

  test('should run initialization on "afterPluginsInit" hook', () => {
    registerRollupSearchStrategy(kbnServer, {
      plugins: {},
    });

    expect(kbnServer.afterPluginsInit).toHaveBeenCalled();
  });

  test('should run initialization if metrics plugin available', () => {
    registerRollupSearchStrategy(kbnServer, {
      plugins: {
        metrics,
      },
    });

    expect(metrics.addSearchStrategy).toHaveBeenCalled();
  });

  test('should not run initialization if metrics plugin unavailable', () => {
    registerRollupSearchStrategy(kbnServer, {
      plugins: {},
    });

    expect(metrics.addSearchStrategy).not.toHaveBeenCalled();
  });
});
