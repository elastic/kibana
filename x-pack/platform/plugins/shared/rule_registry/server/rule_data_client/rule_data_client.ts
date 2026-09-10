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

/**
 * Returns true when the bulk response failed and every failed item was rejected
 * because the target index / write alias does not exist. This distinguishes a
 * missing write target (which can be resolved by installing resources) from
 * per-document failures such as version conflicts or mapping errors.
 */
const isIndexNotFoundBulkResponse = (body: estypes.BulkResponse): boolean => {
  if (!body.errors) {
    return false;
  }

  const failedItems = body.items.filter((item) => Object.values(item).some((op) => op?.error));

  if (failedItems.length === 0) {
    return false;
  }

  return failedItems.every((item) =>
    Object.values(item).every((op) => !op?.error || op.error.type === 'index_not_found_exception')
  );
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

    const executeBulk = async (request: estypes.BulkRequest) => {
      return this.clusterClient!.bulk(
        {
          ...request,
          require_alias: !this._isUsingDataStreams,
          index: alias,
        },
        { meta: true }
      );
    };

    return {
      bulk: async (request: estypes.BulkRequest) => {
        try {
          if (this.clusterClient) {
            let response = await executeBulk(request);

            if (!response.body.errors) {
              return response;
            }

            // If every item failed because the write alias / concrete index does not exist,
            // the resources were never installed (or were removed). Rather than logging the
            // full 404 bulk body on every rule execution forever, attempt to (re)install the
            // namespace-level resources once and retry the write.
            if (isIndexNotFoundBulkResponse(response.body)) {
              this.options.logger.warn(
                `The write target "${alias}" does not exist for the ${indexInfo.indexOptions.registrationContext} registration context. Attempting to (re)install namespace-level resources and retry.`
              );

              try {
                await resourceInstaller.installAndUpdateNamespaceLevelResources(
                  indexInfo,
                  namespace
                );
                response = await executeBulk(request);

                if (!response.body.errors) {
                  return response;
                }
              } catch (installError) {
                this.options.logger.error(
                  `Failed to (re)install namespace-level resources for "${alias}" (${indexInfo.indexOptions.registrationContext}): ${installError.message}`
                );
              }

              // If the write target is still missing after attempting installation, log a
              // single concise, actionable error instead of the entire bulk response body.
              if (isIndexNotFoundBulkResponse(response.body)) {
                this.options.logger.error(
                  `Could not write alerts for the ${indexInfo.indexOptions.registrationContext} registration context because the write target "${alias}" does not exist and could not be created.`
                );
                return response;
              }
            }

            // TODO: #160572 - add support for version conflict errors, in case alert was updated
            // some other way between the time it was fetched and the time it was updated.
            // Redact part of reason message that echoes back value
            const sanitizedResponse = sanitizeBulkErrorResponse(response) as TransportResult<
              estypes.BulkResponse,
              unknown
            >;
            const error = new errors.ResponseError(sanitizedResponse);
            this.options.logger.error(error);
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
