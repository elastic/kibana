/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_BASE_PREFIX, ENTITY_SCHEMA_VERSION_V2 } from './entity_index';

export const SYSTEM_EVENTS_DATASET = 'system' as const;

const SYSTEM_EVENTS_PREFIX =
  `.${ENTITY_BASE_PREFIX}.${ENTITY_SCHEMA_VERSION_V2}.${SYSTEM_EVENTS_DATASET}` as const;

/** Index pattern that covers every system events stream in every space. Roles grant `read` on it. */
export const SYSTEM_EVENTS_INDEX_PATTERN = `${SYSTEM_EVENTS_PREFIX}.*` as const;

/** Raw extraction run docs. Short retention; compacted daily into the events stream. */
export const getExtractionRunsDataStreamName = (namespace: string) =>
  `${SYSTEM_EVENTS_PREFIX}.extraction_runs.${namespace}` as const;

/** History snapshot and maintainer runs, lifecycle events and daily extraction summaries. */
export const getSystemEventsDataStreamName = (namespace: string) =>
  `${SYSTEM_EVENTS_PREFIX}.events.${namespace}` as const;

export const getSystemEventsDashboardId = (namespace: string) =>
  `entity-store-system-events-${namespace}` as const;
