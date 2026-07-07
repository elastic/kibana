/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { getStreamSamplingSource } from '@kbn/streams-schema';
import { createServerRoute } from '../../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../../common/constants';
import {
  createCodeRepositoryReader,
  identifyCodeFeatures,
  identifyCodeQueries,
} from '../../../../../lib/significant_events/code_intelligence';

// ---------------------------------------------------------------------------
// Identify code-driven Feature KIs for a single stream (Stage 1).
//
// Backs the scheduled continuous code-KI extraction managed workflow. Derives
// `repo_type`, `language`, and `service_name` features from the stream's
// SCS-indexed repository, tagged with code evidence, and reconciles them with
// existing features. No-ops when the repository is unchanged since the last run.
// ---------------------------------------------------------------------------

const identifyCodeFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/code_features/_identify',
  options: {
    access: 'internal',
    summary: 'Identify code-driven KI features for a stream from its indexed repository',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z
      .object({
        runId: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamsClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const routeLogger = logger.get('code_features', streamName);
    const { runId = uuidv4() } = params.body ?? {};

    // Code feature identification requires the SCS Agent Builder tools to read
    // the source. When Agent Builder is unavailable, there is nothing to do.
    const agentBuilderTools = server.agentBuilder?.tools;
    if (!agentBuilderTools) {
      routeLogger.debug('Agent Builder tools unavailable; skipping code feature identification');
      return { status: 'no_repo' as const };
    }

    const [kiClient, stream] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      streamsClient.getStream(streamName),
    ]);

    const reader = createCodeRepositoryReader({
      esClient: scopedClusterClient.asCurrentUser,
      agentBuilderTools,
      request,
      logger: routeLogger,
    });

    return identifyCodeFeatures({
      streamName,
      samplingIndex: getStreamSamplingSource(stream),
      kiClient,
      reader,
      logger: routeLogger,
      runId,
    });
  },
});

// ---------------------------------------------------------------------------
// Generate predictive Query KIs for a stream from its logger call sites (Stage 2).
//
// Consumes the Stage 1 `service_name` Feature KI as the join key and the
// `tags: logging` code chunks (elastic/semantic-code-search#168) to build
// predictive match queries — including for log lines not yet seen in the data.
// Persisted as durable, non-rule-backed (draft) Query KIs.
// ---------------------------------------------------------------------------

const generateCodeQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/code_features/_generate_queries',
  options: {
    access: 'internal',
    summary: 'Generate predictive KI queries for a stream from its indexed logger call sites',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamsClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const routeLogger = logger.get('code_queries', streamName);

    const agentBuilderTools = server.agentBuilder?.tools;
    if (!agentBuilderTools) {
      routeLogger.debug('Agent Builder tools unavailable; skipping code query generation');
      return { status: 'no_repo' as const };
    }

    const [kiClient, stream] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      streamsClient.getStream(streamName),
    ]);

    const reader = createCodeRepositoryReader({
      esClient: scopedClusterClient.asCurrentUser,
      agentBuilderTools,
      request,
      logger: routeLogger,
    });

    return identifyCodeQueries({ stream, kiClient, reader, logger: routeLogger });
  },
});

export const internalSignificantEventsKICodeFeaturesRoutes = {
  ...identifyCodeFeaturesRoute,
  ...generateCodeQueriesRoute,
};
