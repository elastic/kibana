/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  MemoryEntry,
  MemoryVersionRecord,
  MemoryChangeType,
  MemoryCategoryNode,
  MemorySearchResult,
  CreateMemoryParams,
  UpdateMemoryParams,
  SearchMemoryParams,
  MemoryService,
} from './types';

export { MemoryServiceImpl } from './memory_service';

export {
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from './tool_callbacks';

export { memoriesDataStream } from './data_stream';
export type { StoredMemoryPage } from './data_stream';

export { memoryHistoryDataStream } from './history_data_stream';
