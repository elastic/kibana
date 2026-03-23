/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { ensureMetadata } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { StreamsPluginStartDependencies } from '../../../../types';
import {
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_KQL_BODY,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  STREAM_NAME,
  RULE_ID,
  RULE_BACKED,
  ASSET_UUID,
} from '../fields';
import { queryStorageSettings, type QueryStorageSettings } from '../storage_settings';
import { QueryClient, type StoredQueryLink } from './query_client';
import { computeRuleId, buildEsqlQueryFromKql } from './helpers/query';

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
      {
        migrateSource: (source) => {
          let migrated = source as Record<string, unknown>;

          if (!migrated[QUERY_ESQL_QUERY]) {
            const streamName = migrated[STREAM_NAME] as string;
            const featureFilterJson = migrated[QUERY_FEATURE_FILTER];
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
              kql: { query: migrated[QUERY_KQL_BODY] as string },
              feature:
                migrated[QUERY_FEATURE_NAME] && featureFilter
                  ? {
                      name: migrated[QUERY_FEATURE_NAME] as string,
                      filter: featureFilter,
                      type: 'system' as const,
                    }
                  : undefined,
            };

            // Uses the wired stream pattern as a best-effort fallback:
            // the definition is not available in the sync storage migration callback.
            const esqlQuery = buildEsqlQueryFromKql([streamName, `${streamName}.*`], input);
            migrated = { ...migrated, [QUERY_ESQL_QUERY]: esqlQuery };
          }

          // Ensure METADATA _id, _source is present on all stored queries —
          // covers documents written before METADATA was mandatory.
          migrated = {
            ...migrated,
            [QUERY_ESQL_QUERY]: ensureMetadata(migrated[QUERY_ESQL_QUERY] as string),
          };

          // Back-fill rule_id for pre-existing documents using the KQL query as the hash
          // input — this preserves the IDs of rules that were already created before rule_id
          // was persisted. New documents use the compiled ESQL query instead (see toQueryLinkFromQuery).
          if (!(RULE_ID in migrated)) {
            const uuid = migrated[ASSET_UUID] as string;
            const kqlQuery = migrated[QUERY_KQL_BODY] as string;
            migrated = { ...migrated, [RULE_ID]: computeRuleId(uuid, kqlQuery) };
          }

          // Pre-existing queries were all rule-backed; back-fill the flag so it is persisted.
          if (!(RULE_BACKED in migrated)) {
            migrated = { ...migrated, [RULE_BACKED]: true };
          }

          // Back-fill description for queries created before the field was introduced.
          if (!(QUERY_DESCRIPTION in migrated)) {
            migrated = { ...migrated, [QUERY_DESCRIPTION]: '' };
          }

          return migrated as StoredQueryLink;
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
