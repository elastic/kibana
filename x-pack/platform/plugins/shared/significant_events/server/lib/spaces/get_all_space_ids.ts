/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';

export interface SpaceEnumerationFailure {
  target: 'spaces';
  error: string;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Every space id the caller can see, always including the default space.
 * Never throws: when spaces are unavailable or the lookup fails, the default
 * space alone is returned and the reason is surfaced through `failure` so a
 * cluster-wide sweep cannot silently shrink to one space.
 */
export const getAllSpaceIds = async ({
  request,
  spacesService,
}: {
  request: KibanaRequest;
  spacesService: SpacesServiceStart | undefined;
}): Promise<{ spaceIds: SpaceId[]; failure?: SpaceEnumerationFailure }> => {
  const spacesClient = spacesService?.createSpacesClient(request);
  if (!spacesClient) {
    return {
      spaceIds: [DEFAULT_SPACE_ID],
      failure: {
        target: 'spaces',
        error: 'Spaces client is not available; only the default space was processed',
      },
    };
  }
  try {
    // SpacesClient.getAll already loads every space SO (up to xpack.spaces.maxSpaces).
    const spaces = await spacesClient.getAll();
    const ids = spaces.map((space) => space.id);
    return {
      spaceIds: ids.length > 0 ? [...new Set([DEFAULT_SPACE_ID, ...ids])] : [DEFAULT_SPACE_ID],
    };
  } catch (error) {
    return {
      spaceIds: [DEFAULT_SPACE_ID],
      failure: {
        target: 'spaces',
        error: `Failed to enumerate spaces; only the default space was processed: ${toMessage(
          error
        )}`,
      },
    };
  }
};
