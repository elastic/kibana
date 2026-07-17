/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { toMessage } from './to_message';

/**
 * Enumerate every space id (always including the default space). Prefers the
 * internal repository so pause/reassert are deployment-wide even when the
 * request is synthetic (no user) or space-scoped privileges would under-
 * enumerate spaces the caller cannot see. Surfaces (not just logs) an
 * enumeration failure so callers do not silently skip per-space workflows.
 */
export const getAllSpaceIds = async ({
  server,
  request,
  failures,
  log,
}: {
  server: StreamsServer;
  request: KibanaRequest;
  failures: SignificantEventsMaintenanceFailure[];
  log: Logger;
}): Promise<string[]> => {
  try {
    const repository = server.core.savedObjects.createInternalRepository(['space']);
    const { saved_objects: spaces } = await repository.find({
      type: 'space',
      page: 1,
      perPage: 10_000,
    });
    const ids = spaces.map((space) => space.id);
    if (ids.length > 0) {
      return [...new Set([DEFAULT_SPACE_ID, ...ids])];
    }
  } catch (error) {
    // Fall through to the request-scoped spaces client.
    log.debug(
      `Significant Events maintenance: internal space enumeration failed, falling back to request-scoped client: ${toMessage(
        error
      )}`
    );
  }

  const spacesClient = server.spaces?.spacesService.createSpacesClient(request);
  if (!spacesClient) {
    failures.push({
      target: 'spaces',
      error:
        'Spaces client is not available; only the default space was processed for per-space workflows',
    });
    return [DEFAULT_SPACE_ID];
  }
  try {
    const spaces = await spacesClient.getAll();
    const ids = spaces.map((space) => space.id);
    return ids.length > 0 ? [...new Set([DEFAULT_SPACE_ID, ...ids])] : [DEFAULT_SPACE_ID];
  } catch (error) {
    failures.push({
      target: 'spaces',
      error: `Failed to enumerate spaces; only the default space was processed: ${toMessage(
        error
      )}`,
    });
    return [DEFAULT_SPACE_ID];
  }
};
