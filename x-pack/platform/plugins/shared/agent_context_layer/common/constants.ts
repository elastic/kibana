/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const internalApiPath = '/internal/agent_context_layer';
export const smlSearchPath = `${internalApiPath}/sml/_search`;
export const smlBasePath = `${internalApiPath}/sml`;
/**
 * Path for GET/PUT/DELETE of a single SML origin. The URL parameter is the
 * `origin_id` — globally unique across types — not a per-chunk document id.
 * GET returns every chunk written under that origin (a workflow step may
 * write multiple). PUT/DELETE both operate on the origin as a whole and
 * route through {@link SmlIndexer.indexAttachment} / `deleteAttachment` so
 * permissions and ingestion-method semantics stay consistent with every
 * other write path.
 */
export const smlByOriginIdPath = `${smlBasePath}/{originId}`;
export const smlAutocompletePath = `${internalApiPath}/sml/_autocomplete`;
