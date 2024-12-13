/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import { compact } from 'lodash';
import { IStorageAdapter, StorageDocumentOf, StorageSettings } from '.';
import {
  ObservabilityESSearchRequest,
  ObservabilityElasticsearchClient,
  createObservabilityEsClient,
} from '../client/create_observability_es_client';

type StorageBulkOperation<TDocument extends { _id: string }> =
  | {
      create: { document: Omit<TDocument, '_id'>; _id: string };
    }
  | { delete: { _id: string } };

export class StorageClient<TStorageSettings extends StorageSettings> {
  private readonly esClient: ObservabilityElasticsearchClient;
  constructor(
    private readonly storage: IStorageAdapter<TStorageSettings>,
    esClient: ElasticsearchClient,
    logger: Logger
  ) {
    this.esClient = createObservabilityEsClient({
      client: esClient,
      logger,
    });
  }

  search<TSearchRequest extends Omit<ObservabilityESSearchRequest, 'index'>>(
    operationName: string,
    request: TSearchRequest
  ) {
    return this.esClient.search<
      StorageDocumentOf<TStorageSettings>,
      TSearchRequest & { index: string }
    >(operationName, { ...request, index: this.storage.getSearchIndexPattern() });
  }

  async index({
    id,
    document,
  }: {
    id: string;
    document: Omit<StorageDocumentOf<TStorageSettings>, '_id'>;
  }) {
    await this.esClient.client.index({
      index: this.storage.getSearchIndexPattern(),
      document,
      refresh: 'wait_for',
      id,
    });
  }

  async delete(id: string) {
    await this.esClient.client.delete({
      id,
      refresh: 'wait_for',
      index: this.storage.getSearchIndexPattern(),
    });
  }

  async bulk(operations: Array<StorageBulkOperation<StorageDocumentOf<TStorageSettings>>>) {
    const index = this.storage.getWriteTarget();

    const result = await this.esClient.client.bulk({
      index,
      refresh: 'wait_for',
      operations: operations.flatMap((operation): BulkRequest<unknown, unknown>['operations'] => {
        if ('create' in operation) {
          return [
            {
              create: {
                _id: operation.create._id,
              },
            },
            operation.create.document,
          ];
        }

        return [operation];
      }),
    });

    if (result.errors) {
      const errors = compact(
        result.items.map((item) => {
          const error = Object.values(item).find((operation) => operation.error)?.error;
          return error;
        })
      );
      return {
        errors,
      };
    }

    return {
      acknowledged: true,
    };
  }
}
