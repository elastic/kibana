/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTOR_MEMORY_PLUGIN_ID = 'connectorMemory';

export const DEFAULT_AI_INDEX_ID = 'connector-memory';

export const LOOKUP_TOOL_ID = 'platform.context_engine.lookup_connector_memory';

export const API_BASE_PATH = '/internal/connector_memory';

/** The `summary_kind` of a cached document, weakest first: a stub from the listing, a start-of-text excerpt, a model summary. */
export const SUMMARY_KINDS = ['names', 'excerpt', 'llm'] as const;
export type SummaryKind = (typeof SUMMARY_KINDS)[number];
