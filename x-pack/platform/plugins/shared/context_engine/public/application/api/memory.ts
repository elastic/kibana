/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_MEMORY_API_VERSION,
  buildMemoryApiPath,
  memoryApiPaths,
  type CreateMemoryEntryRequest,
  type MemoryCategoriesResponse,
  type MemoryEntry,
  type MemoryHistoryResponse,
  type MemoryMaintenanceToggleResponse,
  type MemoryRecentChangesResponse,
  type MemorySetupResponse,
  type MemoryStatusResponse,
  type MemoryVersionRecord,
  type MemoryWorkflowRunResponse,
  type MemoryWorkflowType,
  type SearchMemoryRequest,
  type SearchMemoryResponse,
  type UpdateMemoryEntryRequest,
} from '@kbn/agent-memory-common';
import type { HttpStart } from '@kbn/core-http-browser';

interface Signal {
  signal?: AbortSignal;
}

const withVersion = ({ signal }: Signal = {}) => ({
  version: AGENT_MEMORY_API_VERSION,
  ...(signal ? { signal } : {}),
});

export const getMemoryStatus = (http: HttpStart, args: Signal = {}) =>
  http.get<MemoryStatusResponse>(memoryApiPaths.status, withVersion(args));

export const setUpMemory = (http: HttpStart) =>
  http.post<MemorySetupResponse>(memoryApiPaths.setup, withVersion());

export const getMemoryCategories = (http: HttpStart, args: Signal = {}) =>
  http.get<MemoryCategoriesResponse>(memoryApiPaths.categories, withVersion(args));

export const getMemoryEntry = (http: HttpStart, { id, ...args }: { id: string } & Signal) =>
  http.get<MemoryEntry>(buildMemoryApiPath(memoryApiPaths.entryById, { id }), withVersion(args));

export const searchMemory = (
  http: HttpStart,
  { body, ...args }: { body: SearchMemoryRequest } & Signal
) =>
  http.post<SearchMemoryResponse>(memoryApiPaths.search, {
    ...withVersion(args),
    body: JSON.stringify(body),
  });

export const createMemoryEntry = (http: HttpStart, body: CreateMemoryEntryRequest) =>
  http.post<MemoryEntry>(memoryApiPaths.entries, {
    ...withVersion(),
    body: JSON.stringify(body),
  });

export const updateMemoryEntry = (
  http: HttpStart,
  { id, body }: { id: string; body: UpdateMemoryEntryRequest }
) =>
  http.put<MemoryEntry>(buildMemoryApiPath(memoryApiPaths.entryById, { id }), {
    ...withVersion(),
    body: JSON.stringify(body),
  });

export const deleteMemoryEntry = (http: HttpStart, { id }: { id: string }) =>
  http.delete<{ deleted: boolean }>(
    buildMemoryApiPath(memoryApiPaths.entryById, { id }),
    withVersion()
  );

export const getMemoryHistory = (http: HttpStart, { id, ...args }: { id: string } & Signal) =>
  http.get<MemoryHistoryResponse>(
    buildMemoryApiPath(memoryApiPaths.entryHistory, { id }),
    withVersion(args)
  );

export const getMemoryVersion = (
  http: HttpStart,
  { id, version, ...args }: { id: string; version: number } & Signal
) =>
  http.get<MemoryVersionRecord>(
    buildMemoryApiPath(memoryApiPaths.entryHistoryVersion, { id, version }),
    withVersion(args)
  );

export const getRecentMemoryChanges = (http: HttpStart, args: Signal = {}) =>
  http.get<MemoryRecentChangesResponse>(memoryApiPaths.recentChanges, withVersion(args));

export const setMemoryMaintenanceEnabled = (http: HttpStart, { enabled }: { enabled: boolean }) =>
  http.put<MemoryMaintenanceToggleResponse>(memoryApiPaths.maintenanceEnabled, {
    ...withVersion(),
    body: JSON.stringify({ enabled }),
  });

export const setMemoryWorkflowEnabled = (
  http: HttpStart,
  { type, enabled }: { type: MemoryWorkflowType; enabled: boolean }
) =>
  http.put<MemoryMaintenanceToggleResponse>(
    buildMemoryApiPath(memoryApiPaths.maintenanceWorkflowEnabled, { type }),
    { ...withVersion(), body: JSON.stringify({ enabled }) }
  );

export const runMemoryWorkflow = (http: HttpStart, { type }: { type: MemoryWorkflowType }) =>
  http.post<MemoryWorkflowRunResponse>(
    buildMemoryApiPath(memoryApiPaths.maintenanceWorkflowRun, { type }),
    withVersion()
  );
