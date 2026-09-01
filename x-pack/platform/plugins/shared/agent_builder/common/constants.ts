/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const publicApiPath = `/api/agent_builder`;
export const internalApiPath = `/internal/agent_builder`;

export const chatApiPath = `/api/chat`;

export const AGENTBUILDER_PLUGIN_ID = 'agentBuilder';

export const PREFERRED_DEFAULT_CONNECTOR_ID = 'Anthropic-Claude-Sonnet-4-5';

/** Maximum number of conversations returned per page. Also the default. */
export const MAX_CONVERSATIONS_PER_PAGE = 1000;

/**
 * ES default `index.max_result_window`. Conversations beyond this offset are
 * not reachable through offset pagination; requests past it return 400.
 */
export const MAX_RESULT_WINDOW = 10_000;
