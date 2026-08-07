/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Plugin id of the agent_memory plugin. */
export const AGENT_MEMORY_PLUGIN_ID = 'agentMemory';

/**
 * Global (space-agnostic) advanced setting controlling whether memory is offered
 * in the UI. Registered by the agent_memory plugin.
 *
 * Also declared as a literal in
 * `src/platform/packages/shared/deeplinks/context-engine/get_context_engine_nav_panel.ts`,
 * which cannot depend on this package.
 */
export const AGENT_MEMORY_ENABLED_SETTING_ID = 'agentMemory:enabled';

export const AGENT_MEMORY_API_BASE = '/internal/agent_memory';
export const AGENT_MEMORY_API_VERSION = '1';

export const memoryApiPaths = {
  status: `${AGENT_MEMORY_API_BASE}/status`,
  setup: `${AGENT_MEMORY_API_BASE}/_setup`,
  entries: `${AGENT_MEMORY_API_BASE}/entries`,
  entryById: `${AGENT_MEMORY_API_BASE}/entries/{id}`,
  entryByName: `${AGENT_MEMORY_API_BASE}/entries/by-name`,
  entryHistory: `${AGENT_MEMORY_API_BASE}/entries/{id}/history`,
  entryHistoryVersion: `${AGENT_MEMORY_API_BASE}/entries/{id}/history/{version}`,
  search: `${AGENT_MEMORY_API_BASE}/search`,
  categories: `${AGENT_MEMORY_API_BASE}/categories`,
  recentChanges: `${AGENT_MEMORY_API_BASE}/recent-changes`,
  maintenanceEnabled: `${AGENT_MEMORY_API_BASE}/maintenance/enabled`,
  maintenanceWorkflowEnabled: `${AGENT_MEMORY_API_BASE}/maintenance/workflows/{type}/enabled`,
  maintenanceWorkflowRun: `${AGENT_MEMORY_API_BASE}/maintenance/workflows/{type}/_run`,
} as const;

/** Builds a concrete path from one of the templated `memoryApiPaths` entries. */
export const buildMemoryApiPath = (
  template: string,
  params: Record<string, string | number>
): string =>
  Object.entries(params).reduce<string>(
    (path, [key, value]) => path.replace(`{${key}}`, encodeURIComponent(String(value))),
    template
  );

/** The background curation workflows that maintain memory. */
export const MEMORY_WORKFLOW_TYPES = [
  'consolidation',
  'conversation_scraper',
  'gap_detection',
] as const;

export type MemoryWorkflowType = (typeof MEMORY_WORKFLOW_TYPES)[number];
