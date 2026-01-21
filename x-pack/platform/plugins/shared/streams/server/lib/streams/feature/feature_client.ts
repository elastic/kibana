/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { termQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { BaseFeature, Feature, FeatureStatus } from '@kbn/streams-schema';
import objectHash from 'object-hash';
import { isNotFoundError } from '@kbn/es-errors';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_LAST_SEEN,
  FEATURE_STATUS,
  FEATURE_EVIDENCE,
  FEATURE_CONFIDENCE,
  FEATURE_DESCRIPTION,
  FEATURE_TYPE,
  FEATURE_NAME,
  FEATURE_VALUE,
  FEATURE_TAGS,
  FEATURE_META,
} from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import { StatusError } from '../errors/status_error';

interface FeatureBulkIndexOperation {
  index: { feature: Feature };
}
interface FeatureBulkDeleteOperation {
  delete: { id: string };
}

export type FeatureBulkOperation = FeatureBulkIndexOperation | FeatureBulkDeleteOperation;

export class FeatureClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<FeatureStorageSettings, StoredFeature>;
    }
  ) {}

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(stream: string, operations: FeatureBulkOperation[]) {
    return await this.clients.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(stream, operation.index.feature);
          return {
            index: {
              document,
              _id: document[FEATURE_UUID],
            },
          };
        }

        return { delete: { _id: operation.delete.id } };
      }),
      throwOnFail: true,
    });
  }

  async getFeatures(
    stream: string,
    filters?: { status?: FeatureStatus[]; type?: string[] }
  ): Promise<{ hits: Feature[]; total: number }> {
    const filterClauses: QueryDslQueryContainer[] = [...termQuery(STREAM_NAME, stream)];

    if (filters?.type?.length) {
      filterClauses.push({
        bool: {
          should: filters.type.flatMap((type) => termQuery(FEATURE_TYPE, type)),
          minimum_should_match: 1,
        },
      });
    }

    if (filters?.status?.length) {
      filterClauses.push({
        bool: {
          should: filters.status.flatMap((status) => termQuery(FEATURE_STATUS, status)),
          minimum_should_match: 1,
        },
      });
    }

    const featuresResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }

  async getFeature(stream: string, id: string) {
    const hit = await this.clients.storageClient.get({ id }).catch((err) => {
      if (isNotFoundError(err)) {
        throw new StatusError(`Feature ${id} not found`, 404);
      }
      throw err;
    });

    const source = hit._source!;
    if (source[STREAM_NAME] !== stream) {
      throw new StatusError(`Feature ${id} not found`, 404);
    }
    return fromStorage(source);
  }

  async deleteFeature(stream: string, id: string) {
    const feature = await this.getFeature(stream, id);
    return await this.clients.storageClient.delete({ id: feature.id });
  }

  async deleteFeatures(stream: string) {
    const features = await this.getFeatures(stream);
    return await this.clients.storageClient.bulk({
      operations: features.hits.map((feature) => ({
        delete: { _id: feature.id },
      })),
    });
  }
}

function toStorage(stream: string, feature: Feature): StoredFeature {
  return {
    [FEATURE_TYPE]: feature.type,
    [FEATURE_UUID]: getFeatureId(stream, feature),
    [FEATURE_NAME]: feature.name,
    [FEATURE_DESCRIPTION]: feature.description,
    [FEATURE_VALUE]: feature.value,
    [FEATURE_CONFIDENCE]: feature.confidence,
    [FEATURE_EVIDENCE]: feature.evidence,
    [FEATURE_STATUS]: feature.status,
    [FEATURE_LAST_SEEN]: feature.last_seen,
    [FEATURE_TAGS]: feature.tags,
    [STREAM_NAME]: stream,
    [FEATURE_META]: feature.meta,
  };
}

function fromStorage(feature: StoredFeature): Feature {
  return {
    id: feature[FEATURE_UUID],
    type: feature[FEATURE_TYPE],
    name: feature[FEATURE_NAME],
    description: feature[FEATURE_DESCRIPTION],
    value: feature[FEATURE_VALUE],
    confidence: feature[FEATURE_CONFIDENCE],
    evidence: feature[FEATURE_EVIDENCE],
    status: feature[FEATURE_STATUS],
    last_seen: feature[FEATURE_LAST_SEEN],
    tags: feature[FEATURE_TAGS],
    meta: feature[FEATURE_META],
  };
}

export function getFeatureId(stream: string, feature: BaseFeature): string {
  return objectHash({
    [FEATURE_TYPE]: feature.type,
    [STREAM_NAME]: stream,
    [FEATURE_NAME]: feature.name,
    [FEATURE_VALUE]: feature.value,
  });
}
