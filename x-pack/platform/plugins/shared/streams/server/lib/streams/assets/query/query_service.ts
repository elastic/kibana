/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { buildEsqlWhereCondition } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../../../types';
import { createFakeRequestBoundToDefaultSpace } from '../../helpers/fake_request_factory';
import {
  QUERY_ESQL_WHERE,
  QUERY_KQL_BODY,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
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

    const rulesClientRequest =
      !pluginStart.spaces ||
      pluginStart.spaces.spacesService.getSpaceId(request) === DEFAULT_SPACE_ID
        ? request
        : createFakeRequestBoundToDefaultSpace(request);
    const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(rulesClientRequest);

    const adapter = new StorageIndexAdapter<QueryStorageSettings, StoredQueryLink>(
      core.elasticsearch.client.asInternalUser,
      this.logger.get('queries'),
      queryStorageSettings,
      {
        migrateSource: (source) => {
          // Compute esql.where on-read if missing (for legacy documents)
          if (!source[QUERY_ESQL_WHERE]) {
            const featureFilterJson = source[QUERY_FEATURE_FILTER];
            const featureFilter =
              featureFilterJson && typeof featureFilterJson === 'string' && featureFilterJson !== ''
                ? JSON.parse(featureFilterJson)
                : undefined;

            const esqlWhere = buildEsqlWhereCondition({
              kql: { query: source[QUERY_KQL_BODY] as string },
              feature: source[QUERY_FEATURE_NAME]
                ? {
                    name: source[QUERY_FEATURE_NAME] as string,
                    filter: featureFilter,
                    type: 'system',
                  }
                : undefined,
            });

            return { ...source, [QUERY_ESQL_WHERE]: esqlWhere } as StoredQueryLink;
          }
          return source as StoredQueryLink;
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
