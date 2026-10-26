/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocStats, EpochTime, UnitMillis } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';

import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import { parseError } from '../errors/parse_error';

export async function getClusterDefaultFailureStoreRetentionValue({
  esClient,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
}): Promise<string | undefined> {
  let defaultRetention: string | undefined;
  try {
    if (!isServerless) {
      const { persistent, defaults } = await esClient.cluster.getSettings({
        include_defaults: true,
      });
      const persistentDSRetention =
        persistent?.data_streams?.lifecycle?.retention?.failures_default;
      const defaultsDSRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;
      defaultRetention = persistentDSRetention ?? defaultsDSRetention;
    }
  } catch (e) {
    const { statusCode } = parseError(e);
    if (statusCode === 403) {
      // if user doesn't have permissions to read cluster settings, we just return undefined
    } else {
      throw e;
    }
  }
  return defaultRetention;
}

export async function getFailureStoreStats({
  name,
  esClient,
  esClientAsSecondaryAuthUser,
  isServerless,
}: {
  name: string;
  esClient: ElasticsearchClient;
  esClientAsSecondaryAuthUser?: ElasticsearchClient;
  isServerless: boolean;
}): Promise<FailureStoreStatsResponse> {
  const failureStoreDocs =
    isServerless && esClientAsSecondaryAuthUser
      ? await getFailureStoreMeteringSize({ name, esClientAsSecondaryAuthUser })
      : await getFailureStoreSize({ name, esClient });
  const creationDate = await getFailureStoreCreationDate({ name, esClient });

  return {
    size: failureStoreDocs?.total_size_in_bytes,
    count: failureStoreDocs?.count,
    creationDate,
  };
}

async function getFailureStoreSize({
  name,
  esClient,
}: {
  name: string;
  esClient: ElasticsearchClient;
}): Promise<DocStats | undefined> {
  try {
    const response = await esClient.indices.stats({
      index: `${name}${FAILURE_STORE_SELECTOR}`,
      metric: ['docs'],
      forbid_closed_indices: false,
    });
    const docsStats = response?._all?.total?.docs;
    return {
      count: docsStats?.count || 0,
      total_size_in_bytes: docsStats?.total_size_in_bytes || 0,
    };
  } catch (e) {
    const { statusCode } = parseError(e);
    if (statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}

async function getFailureStoreMeteringSize({
  name,
  esClientAsSecondaryAuthUser,
}: {
  name: string;
  esClientAsSecondaryAuthUser: ElasticsearchClient;
}): Promise<DocStats | undefined> {
  try {
    const response = await esClientAsSecondaryAuthUser.transport.request<{
      _total: { num_docs: number; size_in_bytes: number };
    }>({
      method: 'GET',
      path: `/_metering/stats/${name}${FAILURE_STORE_SELECTOR}`,
    });

    return {
      count: response._total?.num_docs || 0,
      total_size_in_bytes: response._total?.size_in_bytes || 0,
    };
  } catch (e) {
    const { statusCode } = parseError(e);
    if (statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}

async function getFailureStoreCreationDate({
  name,
  esClient,
}: {
  name: string;
  esClient: ElasticsearchClient;
}): Promise<number | undefined> {
  let age: number | undefined;
  try {
    const response = await esClient.indices.explainDataLifecycle({
      index: `${name}${FAILURE_STORE_SELECTOR}`,
    });
    const indices = response.indices;
    if (indices && typeof indices === 'object') {
      const firstIndex = Object.values(indices)[0] as {
        index_creation_date_millis?: EpochTime<UnitMillis>;
      };
      age = firstIndex?.index_creation_date_millis;
    }
    return age || undefined;
  } catch (e) {
    const { statusCode } = parseError(e);
    if (statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}
