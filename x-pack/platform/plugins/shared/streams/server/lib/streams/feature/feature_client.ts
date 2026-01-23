/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { termQuery } from '@kbn/es-query';
import type {
  IStorageClient,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { Feature, FeatureType } from '@kbn/streams-schema';
import { FeatureNotFoundError } from '../errors/feature_not_found_error';
import { STREAM_NAME, FEATURE_UUID } from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import type { FeatureTypeRegistry } from './feature_type_registry';

interface FeatureBulkIndexOperation {
  index: { feature: Feature };
}
interface FeatureBulkDeleteOperation {
  delete: { feature: { type: FeatureType; name: string } };
}

export type FeatureBulkOperation = FeatureBulkIndexOperation | FeatureBulkDeleteOperation;

export class FeatureClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<FeatureStorageSettings, StoredFeature>;
    },
    private readonly registry: FeatureTypeRegistry
  ) {}

  async syncFeatureList(
    name: string,
    features: Feature[]
  ): Promise<{ deleted: Feature[]; indexed: Feature[] }> {
    const featuresResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    const existingFeatures = featuresResponse.hits.hits.map((hit) => {
      return hit._source;
    });

    const nextFeatures = features.map((feature) => {
      return this.registry.toStorage(name, feature);
    });

    const nextIds = new Set(nextFeatures.map((feature) => feature[FEATURE_UUID]));
    const featuresDeleted = existingFeatures.filter(
      (feature) => !nextIds.has(feature[FEATURE_UUID])
    );

    const operations: FeatureBulkOperation[] = [
      ...featuresDeleted.map((feature) => ({
        delete: { feature: this.registry.fromStorage(feature), name },
      })),
      ...nextFeatures.map((feature) => ({
        index: { feature: this.registry.fromStorage(feature), name },
      })),
    ];

    if (operations.length) {
      await this.bulk(name, operations);
    }

    return {
      deleted: featuresDeleted.map((feature) => this.registry.fromStorage(feature)),
      indexed: features,
    };
  }

  async linkFeature(name: string, feature: Feature): Promise<Feature> {
    const document = this.registry.toStorage(name, feature);

    await this.clients.storageClient.index({
      id: document[FEATURE_UUID],
      document,
    });

    return feature;
  }

  async unlinkFeature(name: string, feature: Feature): Promise<void> {
    const id = this.registry.getHandler(feature.type).getFeatureUuid(name, feature.name);

    const { result } = await this.clients.storageClient.delete({ id });
    if (result === 'not_found') {
      throw new FeatureNotFoundError(`Feature ${feature.name} not found for stream ${name}`);
    }
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(name: string, operations: FeatureBulkOperation[]) {
    return await this.clients.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = this.registry.toStorage(name, operation.index.feature);
          return {
            index: {
              document,
              _id: document[FEATURE_UUID],
            },
          };
        }

        const id = this.registry
          .getHandler(operation.delete.feature.type)
          .getFeatureUuid(name, operation.delete.feature.name);
        return {
          delete: {
            _id: id,
          },
        };
      }),
      throwOnFail: true,
    });
  }

  async getFeature(name: string, feature: { type: string; name: string }): Promise<Feature> {
    const id = this.registry.getHandler(feature.type).getFeatureUuid(name, feature.name);
    const hit = await this.clients.storageClient.get({ id });

    return this.registry.fromStorage(hit._source!);
  }

  async deleteFeature(
    name: string,
    feature: { type: string; name: string }
  ): Promise<StorageClientDeleteResponse> {
    const id = this.registry.getHandler(feature.type).getFeatureUuid(name, feature.name);
    return await this.clients.storageClient.delete({ id });
  }

  async updateFeature(name: string, feature: Feature): Promise<StorageClientIndexResponse> {
    const id = this.registry.getHandler(feature.type).getFeatureUuid(name, feature.name);
    return await this.clients.storageClient.index({
      document: this.registry.toStorage(name, feature),
      id,
    });
  }

  async getFeatures(name: string): Promise<{ hits: Feature[]; total: number }> {
    const featuresResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => this.registry.fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }
}
