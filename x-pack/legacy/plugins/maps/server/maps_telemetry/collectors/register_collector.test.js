/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerMapsUsageCollector } from './register';

describe('buildCollectorObj#fetch', () => {
  let makeUsageCollectorStub;
  let savedObjectsClient;
  let registerStub;
  let usageCollection;
  let config;

  beforeEach(() => {
    makeUsageCollectorStub = jest.fn();
    savedObjectsClient = jest.fn();
    registerStub = jest.fn();
    config = jest.fn();
    usageCollection = {
      makeUsageCollector: makeUsageCollectorStub,
      registerCollector: registerStub,
    };
  });

  test('makes and registers maps usage collector', async () => {
    registerMapsUsageCollector(usageCollection, savedObjectsClient, config);

    expect(registerStub).toHaveBeenCalledTimes(1);
    expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
    expect(makeUsageCollectorStub).toHaveBeenCalledWith({
      type: expect.any(String),
      isReady: expect.any(Function),
      fetch: expect.any(Function),
    });
  });
});
