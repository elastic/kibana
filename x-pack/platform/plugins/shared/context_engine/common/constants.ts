/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const internalApiPath = '/internal/context_engine';
export const ceSearchPath = `${internalApiPath}/_search`;
export const ceBasePath = internalApiPath;
// Both `type` and `originId` are required: the canonical storage key is `origin.uri = ${type}://${originId}` — bare originId values are not globally unique.
export const ceByTypeAndOriginIdPath = `${ceBasePath}/{type}/{originId}`;
export const ceAutocompletePath = `${internalApiPath}/_autocomplete`;

export const MAX_CE_ORIGIN_ID_LENGTH = 512;

export const MAX_CE_TYPE_LENGTH = 256;
export const MAX_CE_TITLE_LENGTH = 1024;
export const MAX_CE_CONTENT_LENGTH = 50_000;
export const MAX_CE_TAG_LENGTH = 100;
export const MAX_CE_TAGS_PER_DOCUMENT = 100;
// Cross-space guard may miss entries beyond this limit — see findByOriginAcrossSpaces.
export const MAX_ENTRIES_PER_ORIGIN = 1000;
