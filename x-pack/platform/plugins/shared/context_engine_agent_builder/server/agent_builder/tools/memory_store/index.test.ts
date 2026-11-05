/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from '../../../config';
import { createElasticsearchMemoryStore, getMemoryBackend } from '.';

describe('getMemoryBackend', () => {
  it('defaults to the Elasticsearch store, recalled through AI index queries', () => {
    const { memory } = configSchema.validate({});

    expect(memory.store).toEqual({ type: 'elasticsearch' });
    expect(getMemoryBackend(memory.store)).toEqual({
      createStore: createElasticsearchMemoryStore,
    });
  });

  it('returns a Supermemory store with search when configured', () => {
    const { memory } = configSchema.validate({
      memory: { store: { type: 'supermemory', apiKey: 'sm_test' } },
    });

    expect(memory.store).toEqual({
      type: 'supermemory',
      apiKey: 'sm_test',
      url: 'https://api.supermemory.ai',
      namespacePrefix: 'kibana',
    });
    const { createStore, createSearch } = getMemoryBackend(memory.store);
    expect(createStore).not.toBe(createElasticsearchMemoryStore);
    expect(createSearch).toBe(createStore);
  });

  it.each([
    ['mem0', { apiKey: 'm0_test' }],
    [
      'agentcore',
      {
        region: 'us-east-1',
        memoryId: 'kibana_memory-abcdefghij',
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'secret',
      },
    ],
  ])('returns a %s store with search when configured', (type, settings) => {
    const { memory } = configSchema.validate({ memory: { store: { type, ...settings } } });

    const { createStore, createSearch } = getMemoryBackend(memory.store);
    expect(memory.store.type).toBe(type);
    expect(createStore).not.toBe(createElasticsearchMemoryStore);
    expect(createSearch).toBe(createStore);
  });

  it('requires AWS credentials for the AgentCore store', () => {
    expect(() =>
      configSchema.validate({
        memory: {
          store: { type: 'agentcore', region: 'us-east-1', memoryId: 'kibana_memory-abcdefghij' },
        },
      })
    ).toThrow();
  });

  it('requires an API key for the Supermemory store', () => {
    expect(() => configSchema.validate({ memory: { store: { type: 'supermemory' } } })).toThrow();
  });
});
