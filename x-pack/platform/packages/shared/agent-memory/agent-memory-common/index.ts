/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENT_MEMORY_API_BASE,
  AGENT_MEMORY_API_VERSION,
  AGENT_MEMORY_ENABLED_SETTING_ID,
  AGENT_MEMORY_PLUGIN_ID,
  MEMORY_WORKFLOW_TYPES,
  buildMemoryApiPath,
  memoryApiPaths,
} from './constants';
export type { MemoryWorkflowType } from './constants';

export { AGENT_MEMORY_FEATURE_ID, apiPrivileges, uiPrivileges } from './features';

export {
  MAX_MEMORY_ARRAY_LENGTH,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_TEXT_LENGTH,
  MAX_MEMORY_TITLE_LENGTH,
} from './limits';

export { MEMORY_SEARCH_MODES, resolveMemorySearchMode } from './search_modes';
export type { MemorySearchMode } from './search_modes';

export type {
  MemoryCategoryNode,
  MemoryChangeType,
  MemoryEntry,
  MemorySearchResult,
  MemoryVersionRecord,
} from './types';

export type {
  CreateMemoryEntryRequest,
  MemoryCategoriesResponse,
  MemoryEntryResponse,
  MemoryHistoryResponse,
  MemoryMaintenanceToggleResponse,
  MemoryRecentChangesResponse,
  MemorySetupResponse,
  MemoryState,
  MemoryStatusResponse,
  MemoryUnavailableReason,
  MemoryWorkflowRunResponse,
  MemoryWorkflowStatus,
  SearchMemoryRequest,
  SearchMemoryResponse,
  UpdateMemoryEntryRequest,
} from './http_api';
