/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { API_BASE } from '../../common';

const STREAMS_INDEX = '.kibana_streams';

interface WiredStreamDoc {
  type: string;
  name: string;
  ingest?: {
    processing?: {
      steps: any[];
    };
    wired?: {
      routing: Array<{
        destination: string;
        where: any;
        status?: string;
      }>;
    };
  };
}

export const registerBundleRoutes = (router: IRouter, logger: Logger) => {
  router.get(
    {
      path: `${API_BASE}/streams/{name}/bundle`,
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
      access: 'public',
      security: {
        authz: { enabled: false, reason: 'Exports stream definitions from .kibana_streams' },
      },
    },
    async (context, request, response) => {
      const { name } = request.params;
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;

      try {
        const searchResponse = await esClient.search<WiredStreamDoc>({
          index: STREAMS_INDEX,
          size: 10000,
          sort: [{ name: 'asc' }],
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      { term: { name } },
                      { prefix: { name: `${name}.` } },
                    ],
                  },
                },
                { term: { type: 'wired' } },
              ],
            },
          },
        });

        const streams = searchResponse.hits.hits
          .map((hit) => hit._source)
          .filter((doc): doc is WiredStreamDoc => doc != null)
          .map((doc) => ({
            name: doc.name,
            processing: {
              steps: doc.ingest?.processing?.steps ?? [],
            },
            routing: (doc.ingest?.wired?.routing ?? []).map((r) => ({
              destination: r.destination,
              where: r.where,
              status: r.status ?? 'enabled',
            })),
          }));

        if (streams.length === 0) {
          return response.notFound({ body: `Stream '${name}' not found` });
        }

        const bundle = {
          version: 1,
          root: name,
          exported_at: new Date().toISOString(),
          streams,
        };

        return response.ok({ body: bundle });
      } catch (err: any) {
        if (err?.meta?.statusCode === 404) {
          return response.notFound({
            body: 'Streams index does not exist. Enable Streams first.',
          });
        }
        logger.error(`Failed to export bundle for stream '${name}': ${err}`);
        return response.customError({ statusCode: 500, body: 'Failed to export bundle' });
      }
    }
  );
};
