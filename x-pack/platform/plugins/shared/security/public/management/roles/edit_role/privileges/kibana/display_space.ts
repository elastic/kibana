/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '@kbn/spaces-plugin/public';

import { ALL_SPACES_ID } from '../../../../../../common/constants';

/**
 * The synthetic "all spaces" (`*`) entry shown throughout role management.
 */
export interface AllSpacesEntry {
  id: typeof ALL_SPACES_ID;
  name: string;
  color?: string;
  initials?: string;
  disabledFeatures: string[];
}

/**
 * Placeholder for a space id referenced by a role privilege that is not present
 * in the loaded spaces list (deleted space, or one the current user cannot see).
 * `id` stays a plain string — it is not guaranteed to be a valid {@link Space.id}.
 */
export interface UnresolvedSpaceEntry {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  disabledFeatures: string[];
  deleted?: true;
}

/**
 * A space displayed in role management: a real {@link Space}, the synthetic
 * {@link AllSpacesEntry} "all spaces" pseudo-entry, or an
 * {@link UnresolvedSpaceEntry} placeholder for a privilege space id that could
 * not be resolved.
 */
export type DisplaySpace = Space | AllSpacesEntry | UnresolvedSpaceEntry;

/** Type guard narrowing a {@link DisplaySpace} to the "all spaces" pseudo-entry. */
export const isAllSpacesEntry = (space: DisplaySpace): space is AllSpacesEntry =>
  space.id === ALL_SPACES_ID;

/** The single source of truth for the "all spaces" pseudo-entry display fields. */
export const createAllSpacesEntry = (name: string): AllSpacesEntry => ({
  id: ALL_SPACES_ID,
  name,
  color: '#D3DAE6',
  initials: '*',
  disabledFeatures: [],
});

/** Build a placeholder for a privilege space id that is not in the loaded list. */
export const createUnresolvedSpaceEntry = (
  spaceId: string,
  options: { deleted?: true } = {}
): UnresolvedSpaceEntry => ({
  id: spaceId,
  name: spaceId,
  disabledFeatures: [],
  ...options,
});
