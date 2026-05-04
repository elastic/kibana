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

const scrapeIntervalSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);

const destinationSchema = z.union([
  z.object({ kind: z.literal('cloudPipeline'), pipelineId: z.string() }),
  z.object({ kind: z.literal('bulkEndpoint') }),
]);

export const listPrometheusScrapersRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/prometheus_scrapers',
  options: { access: 'internal' },
  params: z.object({}),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.read] },
  },
  handler: async ({ request, getScopedClients }) => {
    const { prometheusMock } = await getScopedClients({ request });
    return prometheusMock.list();
  },
});

export const getPrometheusScraperRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/prometheus_scrapers/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.read] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { prometheusMock } = await getScopedClients({ request });
    const scraper = await prometheusMock.get(params.path.id);
    if (!scraper) {
      throw notFound(`Prometheus scraper "${params.path.id}" not found`);
    }
    return scraper;
  },
});

export const createPrometheusScraperRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_flow/prometheus_scrapers',
  options: { access: 'internal' },
  params: z.object({
    body: z.object({
      name: z.string(),
      targetHost: z.string(),
      scrapeIntervalSec: scrapeIntervalSchema,
      destination: destinationSchema,
    }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { prometheusMock } = await getScopedClients({ request });
    return prometheusMock.create(params.body);
  },
});

export const updatePrometheusScraperRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_flow/prometheus_scrapers/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({
      name: z.string().optional(),
      targetHost: z.string().optional(),
      scrapeIntervalSec: scrapeIntervalSchema.optional(),
      destination: destinationSchema.optional(),
    }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { prometheusMock } = await getScopedClients({ request });
    return prometheusMock.update(params.path.id, params.body);
  },
});

export const deletePrometheusScraperRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/_flow/prometheus_scrapers/{id}',
  options: { access: 'internal' },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  security: {
    authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] },
  },
  handler: async ({ request, params, getScopedClients }) => {
    const { prometheusMock } = await getScopedClients({ request });
    await prometheusMock.delete(params.path.id);
    return { acknowledged: true };
  },
});

export const prometheusRoutes = {
  ...listPrometheusScrapersRoute,
  ...getPrometheusScraperRoute,
  ...createPrometheusScraperRoute,
  ...updatePrometheusScraperRoute,
  ...deletePrometheusScraperRoute,
};
