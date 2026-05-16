/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_CONTEXT_LAYER_FEATURE_ID = 'agentContextLayer';
export const AGENT_CONTEXT_LAYER_APP_ID = 'agent_context_layer';
export const AGENT_CONTEXT_LAYER_BASE_PATH = '/app/agent_context_layer';

export const apiPrivileges = {
  readAgentContextLayer: `${AGENT_CONTEXT_LAYER_FEATURE_ID}:read`,
  /**
   * Required to write into the SML index. Checked by
   * {@link AgentContextLayerPluginStart.indexAttachment} so every
   * **user-driven** write path (workflow steps, future HTTP endpoints, …)
   * requires it. The crawler bypasses the start contract and runs as the
   * Kibana service account, so it is not subject to this privilege.
   *
   * The privilege only controls *whether* a user may write at all — per-
   * `originId` access (spaces, permissions tagged on chunks) is enforced
   * separately by the registered SML type's `resolveOriginAccess` hook.
   */
  writeAgentContextLayer: `${AGENT_CONTEXT_LAYER_FEATURE_ID}:write`,
  /**
   * Operator-level capability that gates the ACL management page and the
   * ability to start / stop / restart bundled `sml--` system workflows.
   * Granted independently because it has higher blast radius (it implicitly
   * runs workflows as the Kibana service account).
   */
  manageSystemWorkflows: `${AGENT_CONTEXT_LAYER_FEATURE_ID}:manageSystemWorkflows`,
};

export const uiCapabilities = {
  /** UI gate for the ACL management app and its actions. */
  manageSystemWorkflows: 'manageSystemWorkflows' as const,
};
