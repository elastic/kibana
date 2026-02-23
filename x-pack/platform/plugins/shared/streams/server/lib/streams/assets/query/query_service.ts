/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { buildEsqlQuery } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { StreamsPluginStartDependencies } from '../../../../types';
import {
  QUERY_ESQL_QUERY,
  QUERY_KQL_BODY,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  STREAM_NAME,
} from '../fields';
import { queryStorageSettings, type QueryStorageSettings } from '../storage_settings';
import { QueryClient, type StoredQueryLink } from './query_client';

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<QueryClient> {
    const [core, pluginStart] = await this.coreSetup.getStartServices();

    const soClient = core.savedObjects.getScopedClient(request);
    const uiSettings = core.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const rulesClient = await pluginStart.alerting.getRulesClientWithRequestInSpace(
      request,
      DEFAULT_SPACE_ID
    );

    const adapter = new StorageIndexAdapter<QueryStorageSettings, StoredQueryLink>(
      core.elasticsearch.client.asInternalUser,
      this.logger.get('queries'),
      queryStorageSettings,
      {
        migrateSource: (source) => {
          if (source[QUERY_ESQL_QUERY]) {
            return source as StoredQueryLink;
          }

          const streamName = source[STREAM_NAME] as string;
          const featureFilterJson = source[QUERY_FEATURE_FILTER];
          let featureFilter: Condition | undefined;
          if (
            featureFilterJson &&
            typeof featureFilterJson === 'string' &&
            featureFilterJson !== ''
          ) {
            try {
              featureFilter = JSON.parse(featureFilterJson) as Condition;
            } catch {
              featureFilter = undefined;
            }
          }

          const input = {
            kql: { query: source[QUERY_KQL_BODY] as string },
            feature:
              source[QUERY_FEATURE_NAME] && featureFilter
                ? {
                    name: source[QUERY_FEATURE_NAME] as string,
                    filter: featureFilter,
                    type: 'system' as const,
                  }
                : undefined,
          };

          // Uses the wired stream pattern as a best-effort fallback:
          // the definition is not available in the sync storage migration callback.
          const esqlQuery = buildEsqlQuery([streamName, `${streamName}.*`], input);

          return { ...source, [QUERY_ESQL_QUERY]: esqlQuery } as StoredQueryLink;
        },
      }
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
