/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDataStreams } from './data_streams';

describe('pod data streams', () => {
  // Any call to Elasticsearch fails the test: a pod installs nothing.
  const client = new Proxy({}, { get: () => () => Promise.reject(new Error('no ES calls')) });
  const definition = { name: '.pod-test-stream', version: 1, mappings: { properties: {} } };

  it('hands out one client per registered stream without calling Elasticsearch', async () => {
    const { setup, start } = createDataStreams(client as never);
    setup.registerDataStream(definition as never);
    const first = await start.initializeClient(definition.name);
    expect(first).toBeDefined();
    expect(await start.initializeClient(definition.name)).toBe(first);
  });

  it('rejects duplicate and unknown streams', async () => {
    const { setup, start } = createDataStreams(client as never);
    setup.registerDataStream(definition as never);
    expect(() => setup.registerDataStream(definition as never)).toThrow(/already registered/);
    await expect(start.initializeClient('nope')).rejects.toThrow(/not registered/);
  });
});
