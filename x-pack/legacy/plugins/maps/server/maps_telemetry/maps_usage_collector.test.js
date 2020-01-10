/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initTelemetryCollection } from './maps_usage_collector';

describe('buildCollectorObj#fetch', () => {
  let makeUsageCollectorStub;
  let registerStub;
  let usageCollection;

  beforeEach(() => {
    makeUsageCollectorStub = jest.fn();
    registerStub = jest.fn();
    usageCollection = {
      makeUsageCollector: makeUsageCollectorStub,
      registerCollector: registerStub,
    };
  });

  test('makes and registers maps usage collector', async () => {
    const serverPlaceholder = {};
    initTelemetryCollection(usageCollection, serverPlaceholder);

    expect(registerStub).toHaveBeenCalledTimes(1);
    expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
    expect(makeUsageCollectorStub).toHaveBeenCalledWith({
      type: expect.any(String),
      isReady: expect.any(Function),
      fetch: expect.any(Function),
    });
  });
});
