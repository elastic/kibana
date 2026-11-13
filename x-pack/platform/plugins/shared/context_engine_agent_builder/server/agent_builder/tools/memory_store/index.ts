/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryStoreConfig } from '../../../config';
import { createElasticsearchMemoryStore } from './elasticsearch_memory_store';
import { createAgentCoreMemoryStore } from './agentcore_memory_store';
import { createMem0MemoryStore } from './mem0_memory_store';
import { createSupermemoryMemoryStore } from './supermemory_memory_store';
import type { CreateMemorySearch, CreateMemoryStore } from './types';

export type {
  CreateMemorySearch,
  CreateMemoryStore,
  MemoryRevision,
  MemorySearch,
  MemoryStore,
  MemoryStoreScope,
  RecalledMemory,
} from './types';
export { createElasticsearchMemoryStore } from './elasticsearch_memory_store';

export interface MemoryBackend {
  createStore: CreateMemoryStore;
  /** Absent when memories are recalled with `query_ai_indices` instead of the recall tool. */
  createSearch?: CreateMemorySearch;
}

/** Returns the memory backend selected by `xpack.contextEngineAgentBuilder.memory.store`. */
export const getMemoryBackend = (config: MemoryStoreConfig): MemoryBackend => {
  switch (config.type) {
    case 'supermemory': {
      const createStore = createSupermemoryMemoryStore(config);
      return { createStore, createSearch: createStore };
    }
    case 'mem0': {
      const createStore = createMem0MemoryStore(config);
      return { createStore, createSearch: createStore };
    }
    case 'agentcore': {
      const createStore = createAgentCoreMemoryStore(config);
      return { createStore, createSearch: createStore };
    }
    case 'elasticsearch':
      return { createStore: createElasticsearchMemoryStore };
  }
};
