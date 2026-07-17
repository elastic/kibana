/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const publicApiPath = '/api/context_engine';

export const aiIndexPath = `${publicApiPath}/ai_index`;
export const aiIndexByIdPath = `${aiIndexPath}/{aiIndexId}`;

/**
 * Version of the public AI index API, shared between the server route
 * registration and browser clients.
 */
export const AI_INDEX_API_VERSION = '2023-10-31';

/**
 * Hard limit on the number of AI indices returned by the list API.
 * TODO: Remove this limit (or make it configurable) and add pagination support to List API.
 */
export const MAX_AI_INDICES = 100;

export const MAX_AI_INDEX_ID_LENGTH = 256;
export const MAX_AI_INDEX_NAME_LENGTH = 256;
export const MAX_AI_INDEX_DESCRIPTION_LENGTH = 2048;
export const MAX_AI_INDEX_DEST_VALUE_LENGTH = 1024;
export const MAX_AI_INDEX_AUTOMATION_LENGTH = 1024;
export const MAX_AI_INDEX_SOURCE_VALUE_LENGTH = 10240;
export const MAX_AI_INDEX_AUTOMATIONS = 100;
export const MAX_AI_INDEX_SOURCES = 100;
