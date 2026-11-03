/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';

import { eventLogBridge } from './bridge';
import { ClusterClientAdapter } from '../es/cluster_client_adapter';
import { getEsNames } from '../es/names';
import type { EsContext } from '../es';
import { RETRY_DELAY } from '../es/context';
import { EventLogService } from '../event_log_service';
import { SavedObjectProviderRegistry } from '../saved_object_provider_registry';

/**
 * Writes events from a task runtime straight to the event log data stream with the same service
 * and Elasticsearch adapter Kibana uses. Kibana owns installing the templates and the data stream,
 * so this treats them as ready; only the writing half of the plugin is available (no event log
 * client for querying).
 */
export interface EventLogTasksSetup {
  registerProviderActions: EventLogService['registerProviderActions'];
  getLogger: EventLogService['getLogger'];
  getIndexPattern: EventLogService['getIndexPattern'];
}

class EventLogTasksPlugin implements TasksPlugin<EventLogTasksSetup> {
  private esContext?: EsContext;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(core: CoreTasksSetup): EventLogTasksSetup {
    const real = eventLogBridge.getSetup();
    if (real) return real;

    const logger = this.context.logger.get();
    const esNames = getEsNames(core.savedObjects.getDefaultIndex());
    const esAdapter = new ClusterClientAdapter({
      logger,
      elasticsearchClientPromise: core
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
    this.esContext = esContext;
    const service = new EventLogService({
      config: { indexEntries: true, logEntries: false } as never,
      esContext,
      systemLogger: logger,
      kibanaUUID: randomUUID(),
      savedObjectProviderRegistry: new SavedObjectProviderRegistry(),
      kibanaVersion: this.context.env.packageInfo.version,
    });
    return service;
  }

  start() {}

  async stop() {
    // Events buffered by the adapter are written on its own timer; flush on shutdown.
    await this.esContext?.shutdown();
  }
}

export const plugin = async (context: PluginInitializerContext) => new EventLogTasksPlugin(context);
