/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from '../../../config';
import { createElasticsearchMemoryStore, getMemoryStoreFactory } from '.';

describe('getMemoryStoreFactory', () => {
  it('defaults to the Elasticsearch store', () => {
    const { memory } = configSchema.validate({});

    expect(memory.store).toEqual({ type: 'elasticsearch' });
    expect(getMemoryStoreFactory(memory.store)).toBe(createElasticsearchMemoryStore);
  });

  it('returns a Supermemory store factory when configured', () => {
    const { memory } = configSchema.validate({
      memory: { store: { type: 'supermemory', apiKey: 'sm_test' } },
    });

    expect(memory.store).toEqual({
      type: 'supermemory',
      apiKey: 'sm_test',
      url: 'https://api.supermemory.ai',
      namespacePrefix: 'kibana',
    });
    expect(getMemoryStoreFactory(memory.store)).not.toBe(createElasticsearchMemoryStore);
  });

  it('requires an API key for the Supermemory store', () => {
    expect(() => configSchema.validate({ memory: { store: { type: 'supermemory' } } })).toThrow();
  });
});
