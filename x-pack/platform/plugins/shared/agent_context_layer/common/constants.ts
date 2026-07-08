/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const internalApiPath = '/internal/agent_context_layer';
export const smlSearchPath = `${internalApiPath}/sml/_search`;
export const smlBasePath = `${internalApiPath}/sml`;
// Both `type` and `originId` are required: the canonical storage key is `origin.uri = ${type}://${originId}` — bare originId values are not globally unique.
export const smlByTypeAndOriginIdPath = `${smlBasePath}/{type}/{originId}`;
export const smlAutocompletePath = `${internalApiPath}/sml/_autocomplete`;

export const MAX_SML_ORIGIN_ID_LENGTH = 512;

export const MAX_SML_TYPE_LENGTH = 256;
export const MAX_CHUNKS_PER_ORIGIN = 1000;
