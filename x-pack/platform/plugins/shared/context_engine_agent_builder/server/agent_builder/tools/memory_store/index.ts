/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryStoreConfig } from '../../../config';
import { createElasticsearchMemoryStore } from './elasticsearch_memory_store';
import { createSupermemoryMemoryStore } from './supermemory_memory_store';
import type { CreateMemoryStore } from './types';

export type { CreateMemoryStore, MemoryRevision, MemoryStore, MemoryStoreScope } from './types';
export { createElasticsearchMemoryStore } from './elasticsearch_memory_store';

/** Returns the memory store factory selected by `xpack.contextEngineAgentBuilder.memory.store`. */
export const getMemoryStoreFactory = (config: MemoryStoreConfig): CreateMemoryStore =>
  config.type === 'supermemory'
    ? createSupermemoryMemoryStore(config)
    : createElasticsearchMemoryStore;
