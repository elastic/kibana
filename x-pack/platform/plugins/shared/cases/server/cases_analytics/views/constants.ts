/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const CAI_VIEW_NAME_CASE = 'cases.case';
export const CAI_VIEW_NAME_CASE_ACTIVITY = 'cases.case_activity';
export const CAI_VIEW_NAME_CASE_LIFECYCLE = 'cases.case_lifecycle';

export const CAI_VIEW_NAMES = [
  CAI_VIEW_NAME_CASE,
  CAI_VIEW_NAME_CASE_ACTIVITY,
  CAI_VIEW_NAME_CASE_LIFECYCLE,
] as const;

export type CAIViewName = (typeof CAI_VIEW_NAMES)[number];

export const CAI_VIEW_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

/**
 * Bumped whenever the shape of any view changes in a way that consumers
 * (Lens, dashboards, Discover) might depend on. Used by the sync service
 * to detect when an existing view definition is stale and needs to be
 * replaced even if the template-fields union has not changed.
 */
export const CAI_VIEW_SCHEMA_VERSION = 1;

/**
 * Wait window between a templates write and the regenerate PUT. Coalesces
 * bursts (bulk imports, scripted edits) into a single regeneration.
 */
export const CAI_VIEW_REGEN_DEBOUNCE_MS = 30_000;
