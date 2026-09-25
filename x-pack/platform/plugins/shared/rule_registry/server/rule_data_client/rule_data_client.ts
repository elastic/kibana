/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { estypes, TransportResult } from '@elastic/elasticsearch';
import type { Either } from 'fp-ts/Either';
import { isLeft } from 'fp-ts/Either';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { sanitizeBulkErrorResponse } from '@kbn/alerting-plugin/server';
import {
  RuleDataWriteDisabledError,
  RuleDataWriterInitializationError,
} from '../rule_data_plugin_service/errors';
import type { IndexInfo } from '../rule_data_plugin_service/index_info';
import type { IResourceInstaller } from '../rule_data_plugin_service/resource_installer';
import type { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';
import type { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import type { ParsedExperimentalFields } from '../../common/parse_experimental_fields';

export interface RuleDataClientConstructorOptions {
  indexInfo: IndexInfo;
  resourceInstaller: IResourceInstaller;
  isWriteEnabled: boolean;
  isWriterCacheEnabled: boolean;
  waitUntilReadyForReading: Promise<WaitResult>;
  waitUntilReadyForWriting: Promise<WaitResult>;
  logger: Logger;
  isUsingDataStreams: boolean;
}

export type WaitResult = Either<Error, ElasticsearchClient>;

const VERSION_CONFLICT_STATUS = 409;

/**
 * Returns true when a bulk response reports errors but every failing item is a benign
 * `op_type: create` version conflict (HTTP 409). Alert documents are written with a deterministic
 * `_id`, so concurrent or retried rule executions can legitimately attempt to create the same
 * document twice; the resulting 409 is expected and should not be logged as an error.
 */
const bulkResponseHasOnlyVersionConflictErrors = (response: estypes.BulkResponse): boolean => {
  const failedItems = response.items.filter((item) => {
    const operation = item.create ?? item.index ?? item.update ?? item.delete;
    return operation?.error != null;
  });

  if (failedItems.length === 0) {
    return false;
  }

  return failedItems.every((item) => item.create?.status === VERSION_CONFLICT_STATUS);
};

export class RuleDataClient implements IRuleDataClient {
  private _isWriteEnabled: boolean = false;
  private _isWriterCacheEnabled: boolean = true;
  private readonly _isUsingDataStreams: boolean;

  // Writers cached by namespace
  private writerCache: Map<string, IRuleDataWriter>;

  private clusterClient: ElasticsearchClient | null = null;

  constructor(private readonly options: RuleDataClientConstructorOptions) {
    this.writeEnabled = this.options.isWriteEnabled;
    this.writerCacheEnabled = this.options.isWriterCacheEnabled;
    this._isUsingDataStreams = this.options.isUsingDataStreams;
    this.writerCache = new Map();
  }

  public get indexName(): string {
    return this.options.indexInfo.baseName;
  }

  public get kibanaVersion(): string {
    return this.options.indexInfo.kibanaVersion;
  }

  public indexNameWithNamespace(namespace: string): string {
    return this.options.indexInfo.getPrimaryAlias(namespace);
  }

  private get writeEnabled(): boolean {
    return this._isWriteEnabled;
  }

  private set writeEnabled(isEnabled: boolean) {
    this._isWriteEnabled = isEnabled;
  }

  public isWriteEnabled(): boolean {
    return this.writeEnabled;
  }

  private get writerCacheEnabled(): boolean {
    return this._isWriterCacheEnabled;
  }

  private set writerCacheEnabled(isEnabled: boolean) {
    this._isWriterCacheEnabled = isEnabled;
  }

  public isUsingDataStreams(): boolean {
    return this._isUsingDataStreams;
  }

  public getReader(options: { namespace?: string } = {}): IRuleDataReader {
    const { indexInfo } = this.options;
    const indexPattern = indexInfo.getPatternForReading(options.namespace);

    const waitUntilReady = async () => {
      const result = await this.options.waitUntilReadyForReading;
      if (isLeft(result)) {
        throw result.left;
      } else {
        return result.right;
      }
    };

    return {
      search: async <
        TSearchRequest extends ESSearchRequest,
        TAlertDoc = Partial<ParsedTechnicalFields & ParsedExperimentalFields>
      >(
        request: TSearchRequest
      ): Promise<ESSearchResponse<TAlertDoc, TSearchRequest>> => {
        try {
          const clusterClient = await waitUntilReady();
          return (await clusterClient.search({
            ...request,
            index: indexPattern,
            ignore_unavailable: true,
            seq_no_primary_term: true,
          })) as unknown as ESSearchResponse<TAlertDoc, TSearchRequest>;
        } catch (err) {
          this.options.logger.error(`Error performing search in RuleDataClient - ${err.message}`);
          throw err;
        }
      },

      getDynamicIndexPattern: async () => {
        const clusterClient = await waitUntilReady();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        try {
          const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
            pattern: indexPattern,
          });

          return {
            fields,
            timeFieldName: '@timestamp',
            title: indexPattern,
          };
        } catch (err) {
          if (err.output?.payload?.code === 'no_matching_indices') {
            return {
              fields: [],
              timeFieldName: '@timestamp',
              title: indexPattern,
            };
          }
          this.options.logger.error(
            `Error fetching index patterns in RuleDataClient - ${err.message}`
          );
          throw err;
        }
      },
    };
  }

  public async getWriter(options: { namespace?: string } = {}): Promise<IRuleDataWriter> {
    const namespace = options.namespace || 'default';
    const cachedWriter = this.writerCache.get(namespace);
    const isWriterCacheEnabled = () => this.writerCacheEnabled;

    // There is no cached writer, so we'll install / update the namespace specific resources now.
    if (!isWriterCacheEnabled() || !cachedWriter) {
      const writerForNamespace = await this.initializeWriter(namespace);
      this.writerCache.set(namespace, writerForNamespace);
      return writerForNamespace;
    } else {
      return cachedWriter;
    }
  }

  private async initializeWriter(namespace: string): Promise<IRuleDataWriter> {
    const isWriteEnabled = () => this.writeEnabled;

    const { indexInfo, resourceInstaller } = this.options;
    const alias = indexInfo.getPrimaryAlias(namespace);

    // Wait until both index and namespace level resources have been installed / updated.
    if (!isWriteEnabled()) {
      this.options.logger.debug(`Writing is disabled, bulk() will not write any data.`);
      throw new RuleDataWriteDisabledError({
        reason: 'config',
        registrationContext: indexInfo.indexOptions.registrationContext,
      });
    }

    try {
      const indexLevelResourcesResult = await this.options.waitUntilReadyForWriting;

      if (isLeft(indexLevelResourcesResult)) {
        throw new RuleDataWriterInitializationError(
          'index',
          indexInfo.indexOptions.registrationContext,
          indexLevelResourcesResult.left
        );
      } else {
        try {
          await resourceInstaller.installAndUpdateNamespaceLevelResources(indexInfo, namespace);
          this.clusterClient = indexLevelResourcesResult.right;
        } catch (e) {
          throw new RuleDataWriterInitializationError(
            'namespace',
            indexInfo.indexOptions.registrationContext,
            e
          );
        }
      }
    } catch (error) {
      if (error instanceof RuleDataWriterInitializationError) {
        this.options.logger.error(error);
        this.options.logger.error(
          `The writer for the Rule Data Client for the ${indexInfo.indexOptions.registrationContext} registration context was not initialized properly, bulk() cannot continue.`
        );
      }

      throw error;
    }

    return {
      bulk: async (request: estypes.BulkRequest) => {
        try {
          if (this.clusterClient) {
            const requestWithDefaultParameters = {
              ...request,
              require_alias: !this._isUsingDataStreams,
              index: alias,
            };

            const response = await this.clusterClient.bulk(requestWithDefaultParameters, {
              meta: true,
            });

            if (!response.body.errors) {
              return response;
            }

            // Redact part of reason message that echoes back value
            const sanitizedResponse = sanitizeBulkErrorResponse(response) as TransportResult<
              estypes.BulkResponse,
              unknown
            >;
            const error = new errors.ResponseError(sanitizedResponse);

            // A 409 version_conflict_engine_exception on an `op_type: create` write means the
            // alert document (keyed by a deterministic alert UUID `_id`) already exists. This is
            // an expected, benign race for concurrent or retried rule executions writing the same
            // alert and does not indicate data loss (see #160572). Only log at ERROR when the
            // response contains failures that are not benign create conflicts.
            if (bulkResponseHasOnlyVersionConflictErrors(response.body)) {
              this.options.logger.debug(
                () =>
                  `Ignoring benign version conflict errors while writing to index: ${error.message}`
              );
            } else {
              this.options.logger.error(error);
            }
            return sanitizedResponse;
          } else {
            this.options.logger.debug(`Writing is disabled, bulk() will not write any data.`);
          }
        } catch (error) {
          this.options.logger.error(`error writing to index: ${error.message}`, error);
          throw error;
        }
      },
    };
  }
}
