/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import {
  ensureMetadata,
  deriveQueryType,
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
} from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { StreamsPluginStartDependencies } from '../../../../types';
import {
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_KQL_BODY,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_TYPE,
  STREAM_NAME,
  RULE_ID,
  RULE_BACKED,
  ASSET_UUID,
} from '../fields';
import { getQueryStorageSettings } from '../storage_settings';
import { QueryClient, type StoredQueryLink } from './query_client';
import { computeRuleId, buildEsqlQueryFromKql } from './helpers/query';
import type { InferenceResolver } from './helpers/inference_availability';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../../common/sig_events_tuning_config';

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly resolveInference: InferenceResolver,
    private readonly logger: Logger
  ) {}

  async getClient({
    esClient,
    soClient,
    rulesClient,
    config = DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  }: {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    rulesClient: RulesClient;
    config?: Pick<SigEventsTuningConfig, 'semantic_min_score' | 'rrf_rank_constant'>;
  }): Promise<QueryClient> {
    const [core] = await this.coreSetup.getStartServices();

    const uiSettings = core.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const { inferenceId, available: inferenceAvailable } = await this.resolveInference(esClient);

    const settings = getQueryStorageSettings(inferenceId);

    const adapter = new StorageIndexAdapter<IndexStorageSettings, StoredQueryLink>(
      esClient,
      this.logger.get('queries'),
      settings,
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
              } catch (parseError) {
                this.logger.warn(
                  `Failed to parse featureFilter JSON during migration for stream "${
                    migrated[STREAM_NAME]
                  }": ${parseError instanceof Error ? parseError.message : String(parseError)}`
                );
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

          const esqlQuery = migrated[QUERY_ESQL_QUERY] as string;
          // Derive type first — all subsequent migration steps depend on this.
          // Guard against corrupt/empty ES|QL: treat unparseable queries as
          // match (safe default) and force rule_backed=false so no alerting
          // rule is created for a broken query.
          const isCorruptEsql = !esqlQuery || !esqlQuery.trim();
          const derivedType = isCorruptEsql ? QUERY_TYPE_MATCH : deriveQueryType(esqlQuery);

          migrated = { ...migrated, [QUERY_TYPE]: derivedType };

          let metadataFailed = false;
          if (derivedType !== QUERY_TYPE_STATS) {
            try {
              migrated = { ...migrated, [QUERY_ESQL_QUERY]: ensureMetadata(esqlQuery) };
            } catch (metadataError) {
              metadataFailed = true;
              this.logger.warn(
                `ensureMetadata failed during migration for stream "${
                  migrated[STREAM_NAME]
                }", asset "${migrated[ASSET_UUID] ?? 'unknown'}": ${
                  metadataError instanceof Error ? metadataError.message : String(metadataError)
                }. Forcing rule_backed=false to prevent orphaned rule state.`
              );
            }
          }

          // Back-fill rule_id for pre-existing documents using the KQL query as the hash
          // input — this preserves the IDs of rules that were already created before rule_id
          // was persisted. New documents use the compiled ESQL query instead (see toQueryLinkFromQuery).
          if (!(RULE_ID in migrated)) {
            const uuid = migrated[ASSET_UUID] as string;
            const kqlQuery = migrated[QUERY_KQL_BODY] as string;
            migrated = { ...migrated, [RULE_ID]: computeRuleId(uuid, kqlQuery) };
          }

          // Pre-existing queries were all rule-backed; back-fill the flag.
          // STATS queries (introduced alongside the type field) are never
          // rule-backed, so force false to avoid orphaned rule state.
          // Corrupt/empty ES|QL or failed metadata also gets rule_backed=false
          // since the alerting rule can't function without metadata.
          if (!(RULE_BACKED in migrated)) {
            migrated = {
              ...migrated,
              [RULE_BACKED]: !isCorruptEsql && !metadataFailed && derivedType !== QUERY_TYPE_STATS,
            };
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
      isSignificantEventsEnabled,
      inferenceAvailable,
      config
    );
  }
}
