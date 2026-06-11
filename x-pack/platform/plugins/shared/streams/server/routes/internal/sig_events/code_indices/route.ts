/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';

/**
 * Semantic Code Search indexes its primary chunk documents under the
 * `code-<org>_<repo>` naming convention, plus two auxiliary indices per repo
 * (`<index>_locations` and `<index>_settings`). We surface only the primary
 * indices as link candidates.
 */
const CODE_INDEX_PATTERN = 'code-*';
const AUXILIARY_SUFFIXES = ['_locations', '_settings'];

const isPrimaryCodeIndex = (name: string): boolean =>
  !AUXILIARY_SUFFIXES.some((suffix) => name.endsWith(suffix));

export const getCodeIndicesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events/code_indices',
  options: {
    access: 'internal',
    summary: 'List Semantic Code Search indices',
    description:
      'Lists Elasticsearch indices matching the Semantic Code Search naming convention (code-*) that a stream can be linked to for code grounding.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ indices: string[] }> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    try {
      const resolved = await scopedClusterClient.asCurrentUser.indices.resolveIndex({
        name: CODE_INDEX_PATTERN,
        expand_wildcards: 'open',
      });

      const names = new Set<string>();
      for (const index of resolved.indices ?? []) {
        if (isPrimaryCodeIndex(index.name)) {
          names.add(index.name);
        }
      }
      for (const dataStream of resolved.data_streams ?? []) {
        if (isPrimaryCodeIndex(dataStream.name)) {
          names.add(dataStream.name);
        }
      }

      return { indices: [...names].sort() };
    } catch (error) {
      logger.warn(
        `Failed to resolve code indices for pattern "${CODE_INDEX_PATTERN}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { indices: [] };
    }
  },
});

export const internalCodeIndicesRoutes = {
  ...getCodeIndicesRoute,
};
