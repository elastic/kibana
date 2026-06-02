/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 7 — Graph DSL loader endpoint.
 *
 * POST /internal/streams/_graph  — accepts a GraphDsl document, lowers it to per-node
 * GraphStream upsert requests, and provisions each node via the streams state machine.
 *
 * DELETE /internal/streams/_graph/{name} — deletes all nodes in the named topology.
 *
 * These are internal endpoints intended for PoC use; they will move to a proper
 * authoring API surface in Workstream B.
 */

import { z } from '@kbn/zod/v4';
import { badData } from '@hapi/boom';
import { conditionSchema } from '@kbn/streamlang';
import { routingStatus } from '@kbn/streams-schema';
import { ingestStreamLifecycleSchema } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import {
  graphDslToDefinitions,
  graphDslNodeIds,
} from '../../../lib/streams/graph/graph_dsl_loader';

// ---------------------------------------------------------------------------
// DSL Zod schemas (mirrors GraphDsl interface)
// ---------------------------------------------------------------------------

const graphDslEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  where: conditionSchema.optional(),
  status: routingStatus.optional(),
});

const graphDslSourceSchema = z.object({
  type: z.enum(['otlp', 'async_bulk', 'prometheus_remote_write']),
  lifecycle: ingestStreamLifecycleSchema.optional(),
});

const graphDslDestinationSchema = z.object({
  type: z.enum(['elasticsearch']),
  index: z.string().optional(),
  lifecycle: ingestStreamLifecycleSchema.optional(),
});

const graphDslPipelineSchema = z.object({
  steps: z.array(z.any()), // StreamlangStep — validated downstream by the state machine
  lifecycle: ingestStreamLifecycleSchema.optional(),
});

const graphDslSchema = z.object({
  name: z.string(),
  sources: z.record(z.string(), graphDslSourceSchema).optional(),
  destinations: z.record(z.string(), graphDslDestinationSchema).optional(),
  pipelines: z.record(z.string(), graphDslPipelineSchema).optional(),
  routing: z.array(graphDslEdgeSchema),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const loadGraphDslRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_graph',
  options: {
    access: 'internal',
    summary: 'Load a graph stream topology from DSL',
    description:
      'Accepts a Graph DSL document and provisions all nodes as GraphStream definitions. ' +
      'PoC-only; becomes a proper Workstream B API.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: graphDslSchema,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{
    topology: string;
    nodes: string[];
    results: Array<{ name: string; status: 'created' | 'error'; error?: string }>;
  }> => {
    const { streamsClient } = await getScopedClients({ request });

    if (!(await streamsClient.isStreamsEnabled())) {
      throw badData('Streams are not enabled.');
    }

    const dsl = params.body;
    const nodeRequests = graphDslToDefinitions(dsl);
    const results: Array<{ name: string; status: 'created' | 'error'; error?: string }> = [];

    for (const { name, request: upsertRequest } of nodeRequests) {
      try {
        await streamsClient.upsertStream({ name, request: upsertRequest });
        results.push({ name, status: 'created' });
      } catch (err) {
        results.push({ name, status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    }

    return {
      topology: dsl.name,
      nodes: nodeRequests.map((n) => n.name),
      results,
    };
  },
});

export const deleteGraphTopologyRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/_graph/{topology}',
  options: {
    access: 'internal',
    summary: 'Delete all nodes of a graph topology',
    description: 'Deletes every graph stream node whose id is in the topology body.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ topology: z.string() }),
    body: graphDslSchema,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{
    topology: string;
    results: Array<{ name: string; status: 'deleted' | 'error'; error?: string }>;
  }> => {
    const { streamsClient } = await getScopedClients({ request });
    const nodeIds = graphDslNodeIds(params.body);
    const results: Array<{ name: string; status: 'deleted' | 'error'; error?: string }> = [];

    for (const name of nodeIds) {
      try {
        await streamsClient.deleteStream(name);
        results.push({ name, status: 'deleted' });
      } catch (err) {
        results.push({ name, status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { topology: params.path.topology, results };
  },
});

export const graphRoutes = {
  ...loadGraphDslRoute,
  ...deleteGraphTopologyRoute,
};
