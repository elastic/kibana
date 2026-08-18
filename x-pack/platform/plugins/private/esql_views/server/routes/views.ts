/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { VIEWS_API_ROUTE } from '../../common';

interface EsqlViewResponse {
  views: Array<{ name: string; query: string }>;
}

const getErrorStatusCode = (error: unknown): number => {
  const statusCode = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return typeof statusCode === 'number' ? statusCode : 500;
};

const AUTHZ_OPT_OUT = {
  enabled: false as const,
  reason: 'This route delegates authorization to the scoped ES client',
};

/**
 * Thin proxy routes around Elasticsearch's `_query/view` API
 * (https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-views.html), which is
 * the real backing store for ES|QL views. It only persists `{ name, query }` \u2014 any other
 * metadata (description, owner, timestamps) is kept client-side only, see `local_metadata.ts`.
 */
export const registerViewsRoutes = (router: IRouter, logger: Logger) => {
  router.get(
    {
      path: `${VIEWS_API_ROUTE}/{name}`,
      validate: {
        params: schema.object({
          name: schema.string({ minLength: 1, maxLength: 255 }),
        }),
      },
      security: { authz: AUTHZ_OPT_OUT },
      options: { description: 'Fetches a single ES|QL view by name' },
    },
    async (context, request, response) => {
      const { name } = request.params;
      try {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const result = await esClient.transport.request<EsqlViewResponse>({
          method: 'GET',
          path: `/_query/view/${encodeURIComponent(name)}`,
        });

        if (!result.views?.length) {
          return response.notFound();
        }

        return response.ok({ body: result.views[0] });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        if (statusCode === 404) {
          return response.notFound();
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch ES|QL view "${name}": ${message}`, {
          tags: ['esqlViews', 'get'],
        });
        return response.customError({ statusCode, body: { message } });
      }
    }
  );

  router.put(
    {
      path: `${VIEWS_API_ROUTE}/{name}`,
      validate: {
        params: schema.object({
          name: schema.string({ minLength: 1, maxLength: 255 }),
        }),
        body: schema.object({
          query: schema.string({ minLength: 1 }),
        }),
      },
      security: { authz: AUTHZ_OPT_OUT },
      options: { description: 'Creates or updates an ES|QL view (upsert)' },
    },
    async (context, request, response) => {
      const { name } = request.params;
      const { query } = request.body;
      try {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        await esClient.transport.request({
          method: 'PUT',
          path: `/_query/view/${encodeURIComponent(name)}`,
          body: { query },
        });
        return response.ok({ body: { name, query } });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to save ES|QL view "${name}": ${message}`, {
          tags: ['esqlViews', 'put'],
        });
        return response.customError({ statusCode, body: { message } });
      }
    }
  );

  router.delete(
    {
      path: `${VIEWS_API_ROUTE}/{name}`,
      validate: {
        params: schema.object({
          name: schema.string({ minLength: 1, maxLength: 255 }),
        }),
      },
      security: { authz: AUTHZ_OPT_OUT },
      options: { description: 'Deletes an ES|QL view' },
    },
    async (context, request, response) => {
      const { name } = request.params;
      try {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        await esClient.transport.request(
          {
            method: 'DELETE',
            path: `/_query/view/${encodeURIComponent(name)}`,
          },
          { ignore: [404] }
        );
        return response.ok({ body: { name } });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to delete ES|QL view "${name}": ${message}`, {
          tags: ['esqlViews', 'delete'],
        });
        return response.customError({ statusCode, body: { message } });
      }
    }
  );
};
