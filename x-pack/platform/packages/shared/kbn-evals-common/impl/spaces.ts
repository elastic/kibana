/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Restated rather than taken from the spaces plugin, which neither this package
 * nor its offline callers can depend on.
 */
export const DEFAULT_SPACE_ID = 'default';
export const ALL_SPACES_ID = '*';

/**
 * The space a dataset belongs to, which its id is derived from. The active space
 * whenever the dataset will be visible there, so an edit made in place keeps the
 * id it already has; otherwise the first space it is being created for.
 *
 * Shared with the offline client, which uses it to pick the space to send a run
 * to.
 */
export const resolveDatasetHomeSpace = (
  activeSpaceId: string,
  targetSpaceIds: string[]
): string => {
  if (targetSpaceIds.includes(ALL_SPACES_ID) || targetSpaceIds.includes(activeSpaceId)) {
    return activeSpaceId;
  }

  return targetSpaceIds[0] ?? activeSpaceId;
};
