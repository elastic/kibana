/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { OSQUERY_API_VERSION } from '../constants';

const OSQUERY_PACKS_URL = '/api/osquery/packs';
const OSQUERY_SAVED_QUERIES_URL = '/api/osquery/saved_queries';
const OSQUERY_LIVE_QUERIES_URL = '/api/osquery/live_queries';

export interface OsqueryApiService {
  packs: {
    create: (body: Record<string, unknown>, space?: string) => Promise<any>;
    get: (id: string) => Promise<any>;
    delete: (id: string, space?: string) => Promise<void>;
  };
  savedQueries: {
    create: (body: Record<string, unknown>) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  liveQueries: {
    create: (body: Record<string, unknown>) => Promise<any>;
    getDetails: (id: string) => Promise<any>;
    getResults: (id: string, actionId: string) => Promise<any>;
  };
}

export const getOsqueryApiService = ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): OsqueryApiService => {
  const headers = {
    'elastic-api-version': OSQUERY_API_VERSION,
  };

  const buildPath = (basePath: string, space?: string) =>
    space && space !== 'default' ? `/s/${space}${basePath}` : basePath;

  return {
    packs: {
      create: async (body: Record<string, unknown>, space?: string) =>
        await measurePerformanceAsync(
          log,
          'osquery.packs.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: buildPath(OSQUERY_PACKS_URL, space),
              headers,
              body,
            })
        ),

      get: async (id: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.packs.get [${id}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${OSQUERY_PACKS_URL}/${id}`,
              headers,
            })
        ),

      delete: async (id: string, space?: string) => {
        await measurePerformanceAsync(log, `osquery.packs.delete [${id}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `${buildPath(OSQUERY_PACKS_URL, space)}/${id}`,
            headers,
            ignoreErrors: [404],
          });
        });
      },
    },

    savedQueries: {
      create: async (body: Record<string, unknown>) =>
        await measurePerformanceAsync(
          log,
          'osquery.savedQueries.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: OSQUERY_SAVED_QUERIES_URL,
              headers,
              body,
            })
        ),

      delete: async (id: string) => {
        await measurePerformanceAsync(log, `osquery.savedQueries.delete [${id}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `${OSQUERY_SAVED_QUERIES_URL}/${id}`,
            headers,
            ignoreErrors: [404],
          });
        });
      },
    },

    liveQueries: {
      create: async (body: Record<string, unknown>) =>
        await measurePerformanceAsync(
          log,
          'osquery.liveQueries.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: OSQUERY_LIVE_QUERIES_URL,
              headers,
              body,
            })
        ),

      getDetails: async (id: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.liveQueries.getDetails [${id}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${OSQUERY_LIVE_QUERIES_URL}/${id}`,
              headers,
            })
        ),

      getResults: async (id: string, actionId: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.liveQueries.getResults [${id}/${actionId}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${OSQUERY_LIVE_QUERIES_URL}/${id}/results/${actionId}`,
              headers,
            })
        ),
    },
  };
};
