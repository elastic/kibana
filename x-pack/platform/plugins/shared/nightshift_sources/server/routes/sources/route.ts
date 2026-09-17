/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  NIGHTSHIFT_API_PRIVILEGES,
  createSourceRequestSchema,
  listSourcesQuerySchema,
  updateSourceRequestSchema,
  type DeleteSourceResponse,
  type ListSourcesResponse,
  type SourceMutationResponse,
  type SourceWithHealth,
} from '@kbn/nightshift-shared';
import { createNightshiftSourcesServerRoute } from '../create_server_route';

const sourceIdPathSchema = z.object({
  sourceId: z.string().min(1).max(128),
});

const listSourcesRoute = createNightshiftSourcesServerRoute({
  endpoint: 'GET /internal/nightshift/sources',
  options: {
    access: 'internal',
    summary: 'List Nightshift sources',
    description:
      'Returns the sources defined in the current space, sorted by title, each with the health of its ES|QL view.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: listSourcesQuerySchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<ListSourcesResponse> => {
    const client = await getSourcesClient({ request });
    const { page, per_page: perPage, enabled } = params.query;
    return client.list({ page, perPage, enabled });
  },
});

const createSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'POST /internal/nightshift/sources',
  options: {
    access: 'internal',
    summary: 'Create a Nightshift source',
    description:
      'Validates the ES|QL query (FROM or TS, optionally narrowed by WHERE), stores the source and creates its ES|QL view.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: createSourceRequestSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<SourceMutationResponse> => {
    const client = await getSourcesClient({ request });
    const source = await client.create(params.body);
    return { source };
  },
});

const getSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'GET /internal/nightshift/sources/{sourceId}',
  options: {
    access: 'internal',
    summary: 'Get a Nightshift source',
    description:
      'Returns one source with the health of its ES|QL view, including whether the view still resolves.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: sourceIdPathSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<SourceWithHealth> => {
    const client = await getSourcesClient({ request });
    return client.get(params.path.sourceId);
  },
});

const updateSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'PUT /internal/nightshift/sources/{sourceId}',
  options: {
    access: 'internal',
    summary: 'Update a Nightshift source',
    description:
      'Replaces title, description, tags and ES|QL, re-validates the query and re-creates the ES|QL view. Sending the current values repairs a missing or drifted view.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: sourceIdPathSchema,
    body: updateSourceRequestSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<SourceMutationResponse> => {
    const client = await getSourcesClient({ request });
    const source = await client.update(params.path.sourceId, params.body);
    return { source };
  },
});

const deleteSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'DELETE /internal/nightshift/sources/{sourceId}',
  options: {
    access: 'internal',
    summary: 'Delete a Nightshift source',
    description: 'Deletes the ES|QL view (a missing view is ignored) and then the source.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: sourceIdPathSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<DeleteSourceResponse> => {
    const client = await getSourcesClient({ request });
    await client.delete(params.path.sourceId);
    return { acknowledged: true };
  },
});

const enableSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'POST /internal/nightshift/sources/{sourceId}/_enable',
  options: {
    access: 'internal',
    summary: 'Enable a Nightshift source',
    description: 'Marks the source as enabled. Engines pick the flag up on their next reconcile.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: sourceIdPathSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<SourceMutationResponse> => {
    const client = await getSourcesClient({ request });
    const source = await client.setEnabled(params.path.sourceId, true);
    return { source };
  },
});

const disableSourceRoute = createNightshiftSourcesServerRoute({
  endpoint: 'POST /internal/nightshift/sources/{sourceId}/_disable',
  options: {
    access: 'internal',
    summary: 'Disable a Nightshift source',
    description: 'Marks the source as disabled. Engines pick the flag up on their next reconcile.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: sourceIdPathSchema,
  }),
  handler: async ({ params, request, getSourcesClient }): Promise<SourceMutationResponse> => {
    const client = await getSourcesClient({ request });
    const source = await client.setEnabled(params.path.sourceId, false);
    return { source };
  },
});

export const sourcesRoutes = {
  ...listSourcesRoute,
  ...createSourceRoute,
  ...getSourceRoute,
  ...updateSourceRoute,
  ...deleteSourceRoute,
  ...enableSourceRoute,
  ...disableSourceRoute,
};
