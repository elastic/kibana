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

const FLEET_WRAPPER_HEADERS = {
  'elastic-api-version': '1',
};

export interface OsqueryApiService {
  packs: {
    create: (body: Record<string, unknown>, spaceOverride?: string) => Promise<any>;
    get: (id: string, spaceOverride?: string) => Promise<any>;
    delete: (id: string, spaceOverride?: string) => Promise<void>;
    /** Lists osquery_manager package policies via the internal Fleet wrapper (pack config assertions). Not space-prefixed — internal route is not registered under `/s/{space}`. */
    listFleetWrapperPackagePolicies: () => Promise<any>;
  };
  savedQueries: {
    create: (body: Record<string, unknown>, spaceOverride?: string) => Promise<any>;
    delete: (id: string, spaceOverride?: string) => Promise<void>;
  };
  liveQueries: {
    create: (body: Record<string, unknown>, spaceOverride?: string) => Promise<any>;
    getDetails: (id: string, spaceOverride?: string) => Promise<any>;
    getResults: (id: string, actionId: string, spaceOverride?: string) => Promise<any>;
  };
}

export const getOsqueryApiService = ({
  kbnClient,
  log,
  spaceId,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  /** When set (Scout UI parallel `scoutSpace.id`), all Osquery HTTP paths use `/s/{id}/...` unless a per-call override is passed. Omit for default-space API tests. */
  spaceId?: string;
}): OsqueryApiService => {
  const headers = {
    'elastic-api-version': OSQUERY_API_VERSION,
  };

  const buildPath = (basePath: string, space?: string) =>
    space && space !== 'default' ? `/s/${space}${basePath}` : basePath;

  const resolveSpace = (override?: string) => override ?? spaceId;

  return {
    packs: {
      create: async (body: Record<string, unknown>, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          'osquery.packs.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: buildPath(OSQUERY_PACKS_URL, resolveSpace(spaceOverride)),
              headers,
              body,
            })
        ),

      get: async (id: string, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.packs.get [${id}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${buildPath(OSQUERY_PACKS_URL, resolveSpace(spaceOverride))}/${id}`,
              headers,
            })
        ),

      delete: async (id: string, spaceOverride?: string) => {
        await measurePerformanceAsync(log, `osquery.packs.delete [${id}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `${buildPath(OSQUERY_PACKS_URL, resolveSpace(spaceOverride))}/${id}`,
            headers,
            ignoreErrors: [404],
          });
        });
      },

      listFleetWrapperPackagePolicies: async () =>
        await measurePerformanceAsync(log, 'osquery.packs.listFleetWrapperPackagePolicies', async () =>
          kbnClient.request({
            method: 'GET',
            path: '/internal/osquery/fleet_wrapper/package_policies',
            headers: { ...headers, ...FLEET_WRAPPER_HEADERS },
          })
        ),
    },

    savedQueries: {
      create: async (body: Record<string, unknown>, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          'osquery.savedQueries.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: buildPath(OSQUERY_SAVED_QUERIES_URL, resolveSpace(spaceOverride)),
              headers,
              body,
            })
        ),

      delete: async (id: string, spaceOverride?: string) => {
        await measurePerformanceAsync(log, `osquery.savedQueries.delete [${id}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `${buildPath(OSQUERY_SAVED_QUERIES_URL, resolveSpace(spaceOverride))}/${id}`,
            headers,
            ignoreErrors: [404],
          });
        });
      },
    },

    liveQueries: {
      create: async (body: Record<string, unknown>, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          'osquery.liveQueries.create',
          async () =>
            await kbnClient.request({
              method: 'POST',
              path: buildPath(OSQUERY_LIVE_QUERIES_URL, resolveSpace(spaceOverride)),
              headers,
              body,
            })
        ),

      getDetails: async (id: string, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.liveQueries.getDetails [${id}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${buildPath(OSQUERY_LIVE_QUERIES_URL, resolveSpace(spaceOverride))}/${id}`,
              headers,
            })
        ),

      getResults: async (id: string, actionId: string, spaceOverride?: string) =>
        await measurePerformanceAsync(
          log,
          `osquery.liveQueries.getResults [${id}/${actionId}]`,
          async () =>
            await kbnClient.request({
              method: 'GET',
              path: `${buildPath(OSQUERY_LIVE_QUERIES_URL, resolveSpace(spaceOverride))}/${id}/results/${actionId}`,
              headers,
            })
        ),
    },
  };
};
