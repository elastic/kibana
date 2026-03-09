/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../../types';
import { queryStorageSettings, type QueryStorageSettings } from '../storage_settings';
import { QueryClient, type StoredQueryLink } from './query_client';
import { queryVersioning } from './versioning';

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClient({
    soClient,
    rulesClient,
  }: {
    soClient: SavedObjectsClientContract;
    rulesClient: RulesClient;
  }): Promise<QueryClient> {
    const [core] = await this.coreSetup.getStartServices();

    const uiSettings = core.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const adapter = new StorageIndexAdapter<QueryStorageSettings, StoredQueryLink>(
      core.elasticsearch.client.asInternalUser,
      this.logger.get('queries'),
      queryStorageSettings,
      { versioning: queryVersioning }
    );

    return new QueryClient(
      {
        storageClient: adapter.getClient(),
        soClient,
        rulesClient,
        logger: this.logger,
      },
      isSignificantEventsEnabled
    );
  }
}
