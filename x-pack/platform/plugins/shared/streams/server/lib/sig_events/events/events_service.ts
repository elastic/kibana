/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { SigEvent } from '@kbn/streams-schema';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { EventsClient } from './events_client';
import { eventsStorageSettings, type EventsStorageSettings } from './storage_settings';

export class EventsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getInternalClient(): Promise<EventsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<EventsStorageSettings, SigEvent>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('events_client'),
      eventsStorageSettings
    );

    return new EventsClient(adapter.getClient());
  }

  async getScopedClient(request: KibanaRequest): Promise<EventsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<EventsStorageSettings, SigEvent>(
      coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      this.logger.get('events_client'),
      eventsStorageSettings
    );

    return new EventsClient(adapter.getClient());
  }
}
