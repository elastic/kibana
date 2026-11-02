/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLicenseFetcher } from './license_fetcher';

const LICENSE_CACHE_MS = 30_000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Licensing in a task pod: the real license fetcher (same `_xpack` call, normalisation and
 * `License` model as the Licensing plugin) with a short cache, so `getLicense()` answers as it
 * does in Kibana. There is no `license$` stream in a pod; a task reads the license per run.
 */
// A plain object in the shape of `definePodPlugin` (see `@kbn/task-manager-plugin/server/task_pod`):
// Task Manager depends on Licensing, so Licensing cannot import from Task Manager.
export const podPlugins = [
  {
    id: 'licensing',
    start: (
      core: { elasticsearch: { client: any } },
      _plugins: unknown,
      context: { logger: { get: (...parts: string[]) => unknown } }
    ) => {
      const fetchLicense = getLicenseFetcher({
        clusterClient: core.elasticsearch.client,
        logger: context.logger.get('licensing') as never,
        cacheDurationMs: LICENSE_CACHE_MS,
        maxRetryDelay: MAX_RETRY_DELAY_MS,
      });
      // Kibana answers from the license it polls; a pod would otherwise call Elasticsearch for
      // every `getLicense()`, so successful answers are reused for the cache period too.
      let cached: { at: number; license: ReturnType<typeof fetchLicense> } | undefined;
      return {
        getLicense: () => {
          if (cached && Date.now() - cached.at < LICENSE_CACHE_MS) return cached.license;
          const license = fetchLicense();
          const entry = { at: Date.now(), license };
          cached = entry;
          license.catch(() => {
            if (cached === entry) cached = undefined;
          });
          return license;
        },
      };
    },
  },
];
