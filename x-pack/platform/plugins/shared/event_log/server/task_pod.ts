/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';
import { ClusterClientAdapter } from './es/cluster_client_adapter';
import { getEsNames } from './es/names';
import type { EsContext } from './es';
import { EventLogService } from './event_log_service';
import { SavedObjectProviderRegistry } from './saved_object_provider_registry';
import { RETRY_DELAY } from './es/context';

/**
 * Writes events from a task pod straight to the event log data stream with the same service and
 * Elasticsearch adapter Kibana uses. Kibana owns installing the templates and the data stream, so
 * the pod treats them as ready; only the writing half of the plugin is available (no event log
 * client for querying).
 */
export const podPlugins = [
  definePodPlugin({
    id: 'eventLog',
    setup: (core, _plugins, context) => {
      const logger = context.logger.get() as never;
      const kibanaIndex =
        (
          core as { savedObjects: { getDefaultIndex?: () => string } }
        ).savedObjects.getDefaultIndex?.() ?? '.kibana';
      const esNames = getEsNames(kibanaIndex);
      const esAdapter = new ClusterClientAdapter({
        logger,
        elasticsearchClientPromise: (
          core as {
            getStartServices: () => Promise<
              [{ elasticsearch: { client: { asInternalUser: never } } }, ...unknown[]]
            >;
          }
        )
          .getStartServices()
          .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
        esNames,
        wait: async () => true,
      });
      const esContext: EsContext = {
        logger,
        esNames,
        esAdapter,
        initialize: () => undefined,
        shutdown: () => esAdapter.shutdown(),
        waitTillReady: async () => true,
        initialized: true,
        retryDelay: RETRY_DELAY,
        shouldSetExistingAssetsToHidden: false,
      };
      const service = new EventLogService({
        config: { indexEntries: true, logEntries: false } as never,
        esContext,
        systemLogger: logger,
        kibanaUUID: randomUUID(),
        savedObjectProviderRegistry: new SavedObjectProviderRegistry(),
        kibanaVersion: context.env.packageInfo.version,
      });
      // Events buffered by the adapter are written on its own timer; flush on shutdown.
      process.once('SIGTERM', () => void esContext.shutdown());
      return service;
    },
  }),
];
