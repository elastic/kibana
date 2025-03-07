/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { IStorageClient, StorageIndexAdapter, StorageSettings, types } from '@kbn/storage-adapter';
import { StreamDefinition } from '@kbn/streams-schema';
import { schema } from '@kbn/config-schema';
import type { StreamsPluginSetupDependencies, StreamsPluginStartDependencies } from '../../types';
import { StreamsClient } from './client';
import { AssetClient } from './assets/asset_client';

export const streamsStorageSettings = {
  name: '.kibana_streams',
  schema: {
    properties: {
      name: types.keyword(),
      ingest: types.object({ enabled: false }),
      group: types.object({ enabled: false }),
    },
  },
} satisfies StorageSettings;

export type StreamsStorageSettings = typeof streamsStorageSettings;
export type StreamsStorageClient = IStorageClient<StreamsStorageSettings, StreamDefinition>;

export const REINDEX_QUERY_TASK_NAME = 'reindexQueryTask';

export class StreamsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    pluginsSetup: StreamsPluginSetupDependencies,
    private readonly logger: Logger
  ) {
    pluginsSetup.taskManager.registerTaskDefinitions({
      [REINDEX_QUERY_TASK_NAME]: {
        paramsSchema: schema.object({
          apiKey: schema.string(),
        }),
        createTaskRunner: (context) => {
          return {
            run: async () => {},
          };
        },
      },
    });
  }

  async getClientWithRequest({
    request,
    assetClient,
  }: {
    request: KibanaRequest;
    assetClient: AssetClient;
  }): Promise<StreamsClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    const logger = this.logger;

    const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;

    const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);

    const storageAdapter = new StorageIndexAdapter<
      StreamsStorageSettings,
      StreamDefinition & { _id: string }
    >(scopedClusterClient.asInternalUser, logger, streamsStorageSettings);

    return new StreamsClient({
      assetClient,
      logger,
      scopedClusterClient,
      storageClient: storageAdapter.getClient(),
      isServerless,
      rulesClient,
      taskManager: pluginsStart.taskManager,
      request,
      security: pluginsStart.security,
    });
  }
}
