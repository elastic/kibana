/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'kibana',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json',
};

export const API_AGENT_BUILDER = '/api/agent_builder';
export const INTERNAL_AGENT_BUILDER = '/internal/agent_builder';
export const INTERNAL_AGENT_CONTEXT_LAYER = '/internal/agent_context_layer';

/** Public Agent Builder HTTP APIs use this Elastic API version header. */
export const ELASTIC_API_VERSION = '2023-10-31';

/**
 * Fixed port for GitHub-style plugin mock; must match
 * `agent_builder` Scout server config (`kbn-scout` config_sets).
 */
export const SCOUT_AGENT_BUILDER_GITHUB_MOCK_PORT = 18387;

/** Matches Agent Builder chat conversations system index naming. */
export const CHAT_CONVERSATIONS_INDEX = '.chat-conversations';

/** Matches `chatSystemIndex('agents')` from `@kbn/agent-builder-server`. */
export const CHAT_AGENTS_INDEX = '.chat-agents';
