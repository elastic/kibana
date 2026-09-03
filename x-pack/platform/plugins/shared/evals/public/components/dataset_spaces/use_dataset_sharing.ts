/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { UNKNOWN_SPACE } from '@kbn/spaces-plugin/common';
import { useAccessibleSpaces } from '../../hooks/use_spaces';

/**
 * Whether an assignment reaches past the space it was read from, without
 * needing to know which space that was.
 */
export const isSharedAssignment = (spaceIds: string[] | undefined): boolean =>
  (spaceIds?.length ?? 0) > 1;

/**
 * The spaces an edit takes a dataset out of. Spaces the caller cannot see are
 * held out: the picker re-attaches them rather than dropping them.
 */
export const getRemovedSpaceIds = (currentSpaceIds: string[], nextSpaceIds: string[]): string[] =>
  currentSpaceIds.filter((spaceId) => spaceId !== UNKNOWN_SPACE && !nextSpaceIds.includes(spaceId));

export interface DatasetSharing {
  /** Spaces are available, so sharing is worth showing at all. */
  isEnabled: boolean;
  /** Reachable from somewhere other than the space being viewed. */
  isShared: boolean;
  /** Spaces assigned. */
  spaceCount: number;
  /** Names of the assigned spaces other than the active one, where readable. */
  otherSpaceNames: string[];
  /** How many assigned spaces the caller cannot see. */
  hiddenSpaceCount: number;
  /** The assignment without the placeholder for unreadable spaces. */
  namedSpaceIds: string[];
  /** Resolves space ids to display names, falling back to the id. */
  spaceNamesFor: (spaceIds: string[]) => string[];
  activeSpaceId?: string;
  isLoading: boolean;
}

/**
 * Turns a dataset's redacted space assignment into what the UI needs to say
 * whether an edit reaches beyond the space being viewed.
 */
export const useDatasetSharing = (spaceIds: string[] | undefined): DatasetSharing => {
  const { isEnabled, isLoading, activeSpaceId, spaces } = useAccessibleSpaces();

  return useMemo(() => {
    const assigned = spaceIds ?? [];
    const namedSpaceIds = assigned.filter((spaceId) => spaceId !== UNKNOWN_SPACE);
    const hiddenSpaceCount = assigned.length - namedSpaceIds.length;
    const spaceNamesById = new Map(spaces.map((space) => [space.id, space.name]));

    return {
      isEnabled,
      isLoading,
      activeSpaceId,
      // Not compared against the active space, which is undefined in
      // single-space deployments and while spaces load.
      isShared: isSharedAssignment(assigned),
      spaceCount: assigned.length,
      otherSpaceNames: namedSpaceIds
        .filter((spaceId) => spaceId !== activeSpaceId)
        .map((spaceId) => spaceNamesById.get(spaceId) ?? spaceId),
      hiddenSpaceCount,
      namedSpaceIds,
      spaceNamesFor: (ids: string[]) => ids.map((id) => spaceNamesById.get(id) ?? id),
    };
  }, [spaceIds, isEnabled, isLoading, activeSpaceId, spaces]);
};
