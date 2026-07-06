/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// API path strings deliberately retain the original `agent_context_layer/sml`
// wire values (not renamed to `context_engine`) to avoid churning the internal
// HTTP contract; only the exported constant names are de-abbreviated.
export const internalApiPath = '/internal/agent_context_layer';
export const contextEngineSearchPath = `${internalApiPath}/sml/_search`;
export const contextEngineBasePath = `${internalApiPath}/sml`;
// Both `type` and `originId` are required: the canonical storage key is `origin.uri = ${type}://${originId}` — bare originId values are not globally unique.
export const contextEngineByTypeAndOriginIdPath = `${contextEngineBasePath}/{type}/{originId}`;
export const contextEngineAutocompletePath = `${internalApiPath}/sml/_autocomplete`;

export const MAX_CONTEXT_ENGINE_ORIGIN_ID_LENGTH = 512;

export const MAX_CONTEXT_ENGINE_TYPE_LENGTH = 256;
export const MAX_CONTEXT_ENGINE_TITLE_LENGTH = 1024;
export const MAX_CONTEXT_ENGINE_CONTENT_LENGTH = 50_000;
export const MAX_CONTEXT_ENGINE_TAG_LENGTH = 100;
export const MAX_CONTEXT_ENGINE_TAGS_PER_DOCUMENT = 100;
export const MAX_CONTEXT_ENGINE_PERMISSIONS_NAME_LENGTH = 512;
export const MAX_CONTEXT_ENGINE_PERMISSIONS_ENTRIES = 100;
// Cross-space guard may miss entries beyond this limit — see findByOriginAcrossSpaces.
export const MAX_ENTRIES_PER_ORIGIN = 1000;
