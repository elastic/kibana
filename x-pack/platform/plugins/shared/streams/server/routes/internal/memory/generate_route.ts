/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IUiSettingsClient } from '@kbn/core/server';
import { featureSchema, queryTypeSchema } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { resolveConnectorForSignificantEventsDiscovery } from '../../utils/resolve_connector_for_feature';
import { getRequestAbortSignal } from '../../utils/get_request_abort_signal';
import type { MemoryGenerationResult } from '../../../lib/sig_events/memory_generation';
import { generateMemory } from '../../../lib/sig_events/memory_generation';

const isMemoryEnabled = async (uiSettingsClient: IUiSettingsClient): Promise<boolean> => {
  return uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_MEMORY);
};

const querySchema = z.object({
  type: queryTypeSchema,
  title: z.string(),
  esql: z.object({ query: z.string() }),
  severity_score: z.number(),
  description: z.string(),
  evidence: z.array(z.string()).optional(),
  replaces: z.string().optional(),
});

const generateMemoryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/memory/_generate',
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z.object({
      features: z.array(featureSchema).optional(),
      queries: z.array(querySchema).optional(),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Generate memory from discovery indicators',
    description:
      'Runs the memory generation reasoning agent to synthesize features and queries into memory pages.',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<MemoryGenerationResult & { skipped?: boolean; reason?: string }> => {
    const { inferenceClient, uiSettingsClient } = await getScopedClients({ request });

    if (!(await isMemoryEnabled(uiSettingsClient))) {
      return { streamsProcessed: 0, skipped: true, reason: 'memory_disabled' };
    }

    const { streamName } = params.path;
    const { features, queries: rawQueries } = params.body;

    const queries = rawQueries?.map((query) => ({ streamName, query }));

    const connectorId = await resolveConnectorForSignificantEventsDiscovery({
      searchInferenceEndpoints: server.searchInferenceEndpoints,
      request,
    });

    return generateMemory(
      { features, queries },
      {
        inferenceClient,
        connectorId,
        esClient: server.core.elasticsearch.client.asInternalUser,
        logger: logger.get('memory_generation'),
        signal: getRequestAbortSignal(request),
      }
    );
  },
});

export const internalGenerateMemoryRoutes = {
  ...generateMemoryRoute,
};
