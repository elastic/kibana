/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { notFound } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

export const listCloudPipelinesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/cloud_pipelines',
  options: { access: 'internal' },
  params: z.object({}),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.read] },
  },
  handler: async ({ request, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    return cloudPipelinesMock.list();
  },
});

export const getCloudPipelineRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/cloud_pipelines/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.read] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    const pipeline = await cloudPipelinesMock.get(params.path.id);
    if (!pipeline) {
      throw notFound(`Cloud pipeline "${params.path.id}" not found`);
    }
    return pipeline;
  },
});

export const createCloudPipelineRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_flow/cloud_pipelines',
  options: { access: 'internal' },
  params: z.object({
    body: z.object({
      name: z.string(),
      targetStreamName: z.string().optional(),
    }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    return cloudPipelinesMock.create(params.body);
  },
});

export const updateCloudPipelineRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_flow/cloud_pipelines/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({
      name: z.string().optional(),
      targetStreamName: z.string().optional(),
    }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    return cloudPipelinesMock.update(params.path.id, params.body);
  },
});

export const deleteCloudPipelineRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/_flow/cloud_pipelines/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    await cloudPipelinesMock.delete(params.path.id);
    return { acknowledged: true };
  },
});

export const duplicateCloudPipelineRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_flow/cloud_pipelines/{id}/_duplicate',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    return cloudPipelinesMock.duplicate(params.path.id);
  },
});

export const getCloudPipelineMetricsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/cloud_pipelines/_metrics',
  options: { access: 'internal' },
  params: z.object({}),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.read] },
  },
  handler: async ({ request, getScopedClients }) => {
    const { cloudPipelinesMock } = await getScopedClients({ request });
    return cloudPipelinesMock.getMetrics(Date.now(), []);
  },
});

export const cloudPipelinesRoutes = {
  ...listCloudPipelinesRoute,
  ...getCloudPipelineRoute,
  ...createCloudPipelineRoute,
  ...updateCloudPipelineRoute,
  ...deleteCloudPipelineRoute,
  ...duplicateCloudPipelineRoute,
  ...getCloudPipelineMetricsRoute,
};
