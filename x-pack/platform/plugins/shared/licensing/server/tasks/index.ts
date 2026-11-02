/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';

import { getLicenseFetcher } from '../license_fetcher';

const LICENSE_CACHE_MS = 30_000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Licensing for tasks: the real license fetcher (same `_xpack` call, normalisation and `License`
 * model as the Licensing plugin) with a short cache. There is no `license$` stream; a task reads
 * the license per run.
 */
export interface LicensingTasksStart {
  getLicense: () => Promise<ILicense>;
}

class LicensingTasksPlugin implements TasksPlugin<void, LicensingTasksStart> {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup() {}

  start(core: Parameters<TasksPlugin['start']>[0]): LicensingTasksStart {
    const fetchLicense = getLicenseFetcher({
      clusterClient: core.elasticsearch.client,
      logger: this.logger,
      cacheDurationMs: LICENSE_CACHE_MS,
      maxRetryDelay: MAX_RETRY_DELAY_MS,
    });
    // Kibana answers from the license it polls; a task runtime would otherwise call Elasticsearch for
    // every `getLicense()`, so successful answers are reused for the cache period too.
    let cached: { at: number; license: Promise<ILicense> } | undefined;
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
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new LicensingTasksPlugin(context);
