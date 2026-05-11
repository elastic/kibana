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
