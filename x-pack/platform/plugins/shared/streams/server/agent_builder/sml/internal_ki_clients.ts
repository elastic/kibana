/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { FeatureService } from '../../lib/streams/feature/feature_service';
import type { FeatureClient } from '../../lib/streams/feature/feature_client';
import { QueryClient, type StoredQueryLink } from '../../lib/streams/assets/query/query_client';
import {
  type QueryStorageSettings,
  getQueryStorageSettings,
  queryStorageSettings,
} from '../../lib/streams/assets/storage_settings';
import { QUERY_SEARCH_EMBEDDING } from '../../lib/streams/assets/fields';
import {
  type IRulesManagementClient,
  type CreateRuleBody,
  type UpdateRuleBody,
} from '../../lib/streams/assets/query/rules_management_client';
import { getInferenceIdFromIndex } from '../../lib/streams/helpers/get_inference_id_from_index';
import { DEFAULT_SIG_EVENTS_TUNING_CONFIG } from '../../../common/sig_events_tuning_config';
import type { StreamsPluginStartDependencies } from '../../types';

/**
 * No-op rules client used when constructing a QueryClient that will only
 * perform read operations. Calling any of these methods is a programming error
 * — the throw makes that obvious in tests and at runtime.
 */
class ReadOnlyRulesAdapter implements IRulesManagementClient {
  async createRule(_id: string, _body: CreateRuleBody): Promise<void> {
    throw new Error('ReadOnlyRulesAdapter: createRule is not supported in read-only contexts');
  }
  async updateRule(_id: string, _body: UpdateRuleBody): Promise<void> {
    throw new Error('ReadOnlyRulesAdapter: updateRule is not supported in read-only contexts');
  }
  async bulkDeleteRules(_ids: string[]): Promise<void> {
    throw new Error('ReadOnlyRulesAdapter: bulkDeleteRules is not supported in read-only contexts');
  }
}

/**
 * Build a `FeatureClient` bound to the internal Elasticsearch user. Safe to
 * call from non-request contexts such as the SML crawler. The underlying
 * `FeatureService` already uses `asInternalUser` exclusively, so this is just
 * a thin wrapper that hides the request-less ergonomics.
 */
export const getInternalFeatureClient = async (
  coreSetup: CoreSetup<StreamsPluginStartDependencies>,
  logger: Logger
): Promise<FeatureClient> => {
  const service = new FeatureService(coreSetup, logger);
  return service.getClient(DEFAULT_SIG_EVENTS_TUNING_CONFIG);
};

/**
 * Build a `QueryClient` bound to the internal Elasticsearch user. The returned
 * client is read-only — its rules-management adapter throws on any write — and
 * is therefore only safe to use for crawler-style enumeration and lookups.
 *
 * `isSignificantEventsEnabled` is forced to `true` so read paths that gate on
 * the flag still execute; this is correct because the crawler doesn't write.
 */
export const getInternalQueryClient = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<QueryClient> => {
  const existingInferenceId = await getInferenceIdFromIndex(
    esClient,
    queryStorageSettings.name,
    QUERY_SEARCH_EMBEDDING,
    logger
  );

  const storageSettings = getQueryStorageSettings(existingInferenceId);

  const adapter = new StorageIndexAdapter<QueryStorageSettings, StoredQueryLink>(
    esClient,
    logger.get('queries'),
    storageSettings as QueryStorageSettings
  );

  return new QueryClient(
    {
      storageClient: adapter.getClient(),
      rulesManagementClient: new ReadOnlyRulesAdapter(),
      logger,
    },
    true
  );
};
