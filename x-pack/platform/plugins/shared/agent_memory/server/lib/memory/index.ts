/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  CreateMemoryParams,
  MemoryService,
  MemoryServiceDeps,
  SearchMemoryParams,
  UpdateMemoryParams,
} from './types';

export { MemoryServiceImpl } from './memory_service';

export { MEMORIES_DATA_STREAM, MEMORY_HISTORY_DATA_STREAM } from './data_stream_names';

export { memoriesDataStream } from './data_stream';
export type { StoredMemoryPage } from './data_stream';

export { memoryHistoryDataStream } from './history_data_stream';

export { installMemoryTemplates, memoryDataStreamDefinitions } from './install_templates';

export { createMemoryDiscoveryTools, type MemoryDiscoveryTools } from './discovery_tools';
