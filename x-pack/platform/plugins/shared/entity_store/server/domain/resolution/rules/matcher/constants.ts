/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Group-size ceiling: decline the bucket rather than linking an arbitrary subset. */
export const GROUP_SIZE_CEILING = 100;

/**
 * Keyset page size for match-group rows. Must stay at or below ES|QL's
 * `result_truncation_max_size` (10_000); 5_000 was verified to recover every
 * group on a 14k-group fixture.
 */
export const MATCHER_PAGE_SIZE = 5_000;

export const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const ENTITY_NAMESPACE_FIELD = 'entity.namespace';
export const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
export const ENTITY_TYPE = 'user';
