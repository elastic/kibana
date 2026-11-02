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
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

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
 * Per-item bulk failure status codes that are expected during normal alert writing and
 * should not be logged as errors. `409` version conflicts happen routinely while
 * de-duplicating alerts and are already treated as non-fatal by the persistence rule type
 * wrapper (`errorAggregator([409])`).
 */
const IGNORED_BULK_STATUS_CODES: readonly number[] = [409];

/**
 * Returns true when a bulk response contains at least one per-item failure whose status code
 * is not in `ignoreStatusCodes`. Elasticsearch flips the top-level `errors` flag to `true` for
 * any failing item, so this check distinguishes genuine write failures worth logging from
 * benign/expected outcomes such as version conflicts.
 */
const hasNonIgnorableBulkFailures = (
  body: estypes.BulkResponse,
  ignoreStatusCodes: readonly number[]
): boolean =>
  body.items.some((item) => {
    const operation = item.create ?? item.index ?? item.update ?? item.delete;
    return (
      operation?.error != null &&
      operation.status != null &&
      !ignoreStatusCodes.includes(operation.status)
    );
  });

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

            // Elasticsearch sets the top-level `errors` flag to `true` when ANY bulk item
            // fails, including benign/expected outcomes such as `409` version conflicts that
            // occur during alert de-duplication. The persistence rule type wrapper that calls
            // this writer already treats `409` as non-fatal (see `errorAggregator([409])` in
            // `create_persistence_rule_type_wrapper.ts`). Branching on the top-level flag alone
            // caused the entire bulk response (including every successful `201` item) to be
            // logged as an ERROR, producing large, noisy, and misleading log entries.
            // Only treat the response as an error when a non-ignorable per-item failure remains.
            if (!hasNonIgnorableBulkFailures(response.body, IGNORED_BULK_STATUS_CODES)) {
              return response;
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
