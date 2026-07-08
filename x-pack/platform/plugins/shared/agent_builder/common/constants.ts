/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const publicApiPath = `/api/agent_builder`;
export const internalApiPath = `/internal/agent_builder`;

export const AGENTBUILDER_PLUGIN_ID = 'agentBuilder';

export const PREFERRED_DEFAULT_CONNECTOR_ID = 'Anthropic-Claude-Sonnet-4-5';

export const MAX_CHUNKS_PER_ORIGIN = 1000;

// SML route paths (internal)
export const smlSearchPath = `${internalApiPath}/sml/_search`;
export const smlAutocompletePath = `${internalApiPath}/sml/_autocomplete`;
export const smlByTypeAndOriginIdPath = `${internalApiPath}/sml/{type}/{originId}`;
export const smlListPath = `${internalApiPath}/sml`;

export const MAX_SML_ORIGIN_ID_LENGTH = 512;
export const MAX_SML_TYPE_LENGTH = 256;
