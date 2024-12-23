/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkResponseItem,
  IndexResponse,
  IndicesPutIndexTemplateIndexTemplateMapping,
  MappingProperty,
  Refresh,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { InferSearchResponseOf } from '@kbn/es-types';
import stringify from 'json-stable-stringify';
import { last, mapValues, orderBy, padStart } from 'lodash';
import objectHash from 'object-hash';
import {
  IStorageAdapter,
  IndexStorageSettings,
  StorageAdapterBulkRequest,
  StorageAdapterBulkResponse,
  StorageAdapterDeleteRequest,
  StorageAdapterDeleteResponse,
  StorageAdapterIndexRequest,
  StorageAdapterIndexResponse,
  StorageAdapterSearchRequest,
  StorageAdapterSearchResponse,
  StorageSchema,
} from '..';
import { StorageClient } from '../storage_client';
import { StorageMappingProperty } from '../types';
import { IncompatibleSchemaUpdateError } from './errors';

function getAliasName(name: string) {
  return name;
}

function getBackingIndexPattern(name: string) {
  return `${name}-*`;
}

function getBackingIndexName(name: string, count: number) {
  const countId = padStart(count.toString(), 6, '0');
  return `${name}-${countId}`;
}

function getIndexTemplateName(name: string) {
  return `${name}`;
}

function getSchemaVersion(storage: IndexStorageSettings): string {
  const version = objectHash(stringify(storage.schema.properties));
  return version;
}

function isCompatibleOrThrow(
  existingProperties: Record<string, MappingProperty>,
  nextProperties: StorageSchema['properties']
): void {
  const missingProperties: string[] = [];
  const incompatibleProperties: string[] = [];
  Object.entries(existingProperties).forEach(([key, propertyInExisting]) => {
    const propertyInNext = toElasticsearchMappingProperty(nextProperties[key]);
    if (!propertyInNext) {
      missingProperties.push(key);
    } else if (
      propertyInNext.type !== propertyInExisting.type ||
      propertyInExisting.meta?.required !== propertyInNext.meta?.required ||
      propertyInExisting.meta?.multi_value !== propertyInNext.meta?.multi_value
    ) {
      incompatibleProperties.push(key);
    }
  });

  const totalErrors = missingProperties.length + incompatibleProperties.length;

  if (totalErrors > 0) {
    throw new IncompatibleSchemaUpdateError({
      existingProperties,
      nextProperties,
      missingProperties,
      incompatibleProperties,
    });
  }
}

function toElasticsearchMappingProperty(property: StorageMappingProperty): MappingProperty {
  const { required, multi_value: multiValue, enum: enums, ...rest } = property;

  return {
    ...rest,
    meta: {
      ...property.meta,
      required: JSON.stringify(required ?? false),
      multi_value: JSON.stringify(multiValue ?? false),
      ...(enums ? { enum: JSON.stringify(enums) } : {}),
    },
  };
}

export class StorageIndexAdapter<TStorageSettings extends IndexStorageSettings>
  implements IStorageAdapter<TStorageSettings>
{
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly storage: TStorageSettings
  ) {}

  private getSearchIndexPattern(): string {
    return `${getAliasName(this.storage.name)}*`;
  }

  private getWriteTarget(): string {
    return getAliasName(this.storage.name);
  }

  private async createIndexTemplate(create: boolean = true): Promise<void> {
    this.logger.debug(`Creating index template (create = ${create})`);

    const version = getSchemaVersion(this.storage);

    const template: IndicesPutIndexTemplateIndexTemplateMapping = {
      mappings: {
        _meta: {
          version,
        },
        properties: mapValues(this.storage.schema.properties, toElasticsearchMappingProperty),
      },
    };

    await this.esClient.indices.putIndexTemplate({
      name: getIndexTemplateName(this.storage.name),
      create,
      allow_auto_create: false,
      index_patterns: getBackingIndexPattern(this.storage.name),
      _meta: {
        version,
      },
      template,
    });
  }

  private async updateIndexTemplateIfNeeded(): Promise<void> {
    const version = getSchemaVersion(this.storage);
    const indexTemplate = await this.esClient.indices
      .getIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
      })
      .then((templates) => templates.index_templates[0].index_template);

    const currentVersion = indexTemplate._meta?.version;

    this.logger.debug(
      `updateIndexTemplateIfNeeded: Current version = ${currentVersion}, next version = ${version}`
    );

    if (currentVersion === version) {
      return;
    }

    isCompatibleOrThrow(
      indexTemplate.template!.mappings!.properties!,
      this.storage.schema.properties
    );

    this.logger.debug(`Updating index template due to version mismatch`);

    await this.createIndexTemplate(false);
  }

  private async getCurrentWriteIndexName(): Promise<string | undefined> {
    const aliasName = getAliasName(this.storage.name);

    const aliases = await this.esClient.indices
      .getAlias({
        name: getAliasName(this.storage.name),
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return {};
        }
        throw error;
      });

    const writeIndex = Object.entries(aliases)
      .map(([name, alias]) => {
        return {
          name,
          isWriteIndex: alias.aliases[aliasName]?.is_write_index === true,
        };
      })
      .find(({ isWriteIndex }) => {
        return isWriteIndex;
      });

    return writeIndex?.name;
  }

  private async createNextBackingIndex(): Promise<void> {
    const writeIndex = await this.getCurrentWriteIndexName();

    this.logger.debug(`Creating next backing index, current write index = ${writeIndex}`);

    const nextIndexName = getBackingIndexName(
      this.storage.name,
      writeIndex ? parseInt(last(writeIndex.split('-'))!, 10) : 1
    );

    await this.esClient.indices.create({
      index: nextIndexName,
    });
  }

  private async createAlias(): Promise<void> {
    const aliasName = getAliasName(this.storage.name);

    let indexName = await this.getCurrentWriteIndexName();

    if (!indexName) {
      const indices = await this.esClient.indices.get({
        index: getBackingIndexPattern(this.storage.name),
      });

      indexName = orderBy(Object.keys(indices), 'desc')[0];
    }

    if (!indexName) {
      throw new Error(`Could not find backing index for ${aliasName}`);
    }

    await this.esClient.indices.putAlias({
      index: indexName,
      name: aliasName,
      is_write_index: true,
    });
  }

  private async rolloverIfNeeded() {
    const [writeIndexName, indexTemplate, indices] = await Promise.all([
      this.getCurrentWriteIndexName(),
      this.esClient.indices
        .getIndexTemplate({
          name: getIndexTemplateName(this.storage.name),
        })
        .then((templates) => templates.index_templates[0].index_template),
      this.esClient.indices.get({
        index: getBackingIndexPattern(this.storage.name),
      }),
    ]);

    if (!writeIndexName) {
      throw new Error(`No write index found for ${getAliasName(this.storage.name)}`);
    }

    if (!indexTemplate) {
      throw new Error(`No index template found for ${getIndexTemplateName(this.storage.name)}`);
    }

    const writeIndex = indices[writeIndexName];

    const isSameVersion = writeIndex.mappings?._meta?.version === indexTemplate._meta?.version;

    if (!isSameVersion) {
      await this.createNextBackingIndex();
    }
  }

  private async bootstrap() {
    const { name } = this.storage;

    this.logger.debug('Retrieving existing Elasticsearch components');

    const [indexTemplateExists, aliasExists, backingIndexExists] = await Promise.all([
      this.esClient.indices.existsIndexTemplate({
        name: getIndexTemplateName(name),
      }),
      this.esClient.indices.existsAlias({
        name: getAliasName(name),
      }),
      this.esClient.indices.exists({
        index: getBackingIndexPattern(name),
        allow_no_indices: false,
      }),
    ]);

    this.logger.debug(
      () =>
        `Existing components: ${JSON.stringify({
          indexTemplateExists,
          aliasExists,
          backingIndexExists,
        })}`
    );

    if (!indexTemplateExists) {
      await this.createIndexTemplate();
    } else {
      await this.updateIndexTemplateIfNeeded();
    }

    if (!backingIndexExists) {
      await this.createNextBackingIndex();
    }

    if (!aliasExists) {
      await this.createAlias();
    }

    await this.rolloverIfNeeded();
  }

  private async retryAfterBootstrap<T>(cb: () => Promise<T>): Promise<T> {
    return cb().catch(async (error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        this.logger.info(`Write target for ${this.storage.name} not found, bootstrapping`);
        await this.bootstrap();
        return cb();
      }
      throw error;
    });
  }

  async search<TDocument, TSearchRequest extends Omit<SearchRequest, 'index'>>(
    request: StorageAdapterSearchRequest
  ): Promise<StorageAdapterSearchResponse<TDocument, TSearchRequest>> {
    return this.esClient.search({
      ...request,
      index: this.getSearchIndexPattern(),
      allow_no_indices: true,
    }) as unknown as Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  }

  private async removeDanglingItems({ ids, refresh }: { ids: string[]; refresh?: Refresh }) {
    const writeIndex = await this.getCurrentWriteIndexName();

    this.logger.debug(
      () => `Removing dangling items for ${ids.join(', ')}, write index is ${writeIndex}`
    );

    if (writeIndex && ids.length) {
      const danglingItemsResponse = await this.search({
        query: {
          bool: {
            filter: [{ terms: { _id: ids } }],
            must_not: [
              {
                term: {
                  _index: writeIndex,
                },
              },
            ],
          },
        },
        size: 10_000,
      });

      const danglingItemsToDelete = danglingItemsResponse.hits.hits.map((hit) => ({
        id: hit._id!,
        index: hit._index,
      }));

      if (danglingItemsToDelete.length > 0) {
        const shouldRefresh = refresh === true || refresh === 'true' || refresh === 'wait_for';

        this.logger.debug(() => `Deleting ${danglingItemsToDelete.length} dangling items`);

        await this.esClient.deleteByQuery({
          index: this.getSearchIndexPattern(),
          refresh: shouldRefresh,
          wait_for_completion: shouldRefresh,
          query: {
            bool: {
              should: danglingItemsToDelete.map((item) => {
                return {
                  bool: {
                    filter: [
                      {
                        term: {
                          _index: item.index,
                        },
                      },
                      {
                        term: {
                          _id: item.id,
                        },
                      },
                    ],
                  },
                };
              }),
              minimum_should_match: 1,
            },
          },
        });
      }
    }
  }

  async index(request: StorageAdapterIndexRequest): Promise<StorageAdapterIndexResponse> {
    const attemptIndex = (): Promise<IndexResponse> => {
      return this.esClient.index({
        ...request,
        index: this.getWriteTarget(),
        require_alias: true,
      });
    };

    return this.retryAfterBootstrap(attemptIndex).then(async (response) => {
      this.logger.debug(() => `Indexed document ${request.id} into ${response._index}`);
      if (request.id) {
        await this.removeDanglingItems({
          ids: [request.id],
          refresh: request.refresh,
        });
      }

      return response;
    });
  }

  async bulk(request: StorageAdapterBulkRequest): Promise<StorageAdapterBulkResponse> {
    const attemptBulk = () => {
      return this.esClient.bulk({
        ...request,
        index: this.getWriteTarget(),
        require_alias: true,
      });
    };

    return this.retryAfterBootstrap(attemptBulk).then(async (response) => {
      const ids = response.items
        .filter(
          (item): item is { index: BulkResponseItem & { _id: string } } =>
            !!item.index && !!item.index._id && !item.index.error
        )
        .map((item) => item.index._id);

      if (ids.length) {
        await this.removeDanglingItems({ ids, refresh: request.refresh });
      }

      return response;
    });
  }

  async delete({
    id,
    index,
    refresh,
  }: StorageAdapterDeleteRequest): Promise<StorageAdapterDeleteResponse> {
    return await this.esClient.delete({
      index,
      id,
      refresh,
    });
  }

  getClient(): StorageClient<TStorageSettings> {
    return new StorageClient<TStorageSettings>(this, this.logger);
  }
}
