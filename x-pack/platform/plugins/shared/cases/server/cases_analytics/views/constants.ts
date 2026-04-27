/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { OWNERS } from '../../../common/constants/owners';
import type { Owner } from '../../../common/constants/types';

export const CAI_VIEW_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

/**
 * Logical surfaces. Each combines with each owner to produce a concrete
 * view name (e.g. `cases.case.securitysolution`).
 */
export const CAI_VIEW_SURFACES = ['case', 'case_activity', 'case_lifecycle'] as const;
export type CAIViewSurface = (typeof CAI_VIEW_SURFACES)[number];

const CAI_VIEW_NAME_PREFIX = 'cases';

/**
 * Returns the cluster-state view name for a given (surface, owner). The
 * owner segment is lowercased to match the index-name convention used by
 * the analytics indices alias scheme — keeps role-pattern grants from
 * the kibana-cases-security plugin (e.g. `cases.case.*`) trivially
 * matchable.
 */
export const getCAIViewName = (surface: CAIViewSurface, owner: Owner): string =>
  `${CAI_VIEW_NAME_PREFIX}.${surface}.${owner.toLowerCase()}`;

/**
 * The full set of view names this plugin manages. 9 = 3 surfaces × 3 owners.
 */
export const CAI_VIEW_NAMES: readonly string[] = CAI_VIEW_SURFACES.flatMap((surface) =>
  OWNERS.map((owner) => getCAIViewName(surface, owner))
);

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
