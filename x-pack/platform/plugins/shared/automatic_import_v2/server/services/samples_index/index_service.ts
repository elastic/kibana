/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';
import type { AutomaticImportSamplesProperties } from './storage';
import { createIndexAdapter } from './storage';
import type { OriginalSource } from '../../../common';

export interface AddSamplesToDataStreamParams {
  integrationId: string;
  dataStreamId: string;
  rawSamples: string[];
  originalSource: OriginalSource;
  authenticatedUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
}
export class AutomaticImportSamplesIndexService {
  private logger: Logger;

  constructor(logger: LoggerFactory) {
    this.logger = logger.get('samplesIndexService');
  }

  /**
   * Creates samples documents in the samples index.
   */
  public async addSamplesToDataStream(params: AddSamplesToDataStreamParams) {
    const { integrationId, dataStreamId, rawSamples, originalSource, authenticatedUser, esClient } =
      params;

    // Create adapter with the scoped ES client for this request
    const samplesIndexAdapter = createIndexAdapter({
      logger: this.logger,
      esClient,
    });

    const operations = rawSamples.map((sample: string) => {
      const document: Omit<AutomaticImportSamplesProperties, '_id'> = {
        integration_id: integrationId,
        data_stream_id: dataStreamId,
        log_data: sample,
        created_by: authenticatedUser.username,
        original_source: {
          source_type: originalSource.sourceType,
          source_value: originalSource.sourceValue,
        },
        metadata: {
          created_at: new Date().toISOString(),
        },
      };
      return {
        index: {
          document,
        },
      };
    });

    return samplesIndexAdapter.getClient().bulk({ operations });
  }

  /**
   * Gets samples for a data stream
   * @param integrationId - The integration ID
   * @param dataStreamId - The data stream ID
   * @param esClient - The Elasticsearch client to use (scoped to the user)
   * @returns The samples for the data stream
   */
  public async getSamplesForDataStream(
    integrationId: string,
    dataStreamId: string,
    esClient: ElasticsearchClient
  ) {
    // Create adapter with the scoped ES client for this request
    const samplesIndexAdapter = createIndexAdapter({
      logger: this.logger,
      esClient,
    });

    const results = await samplesIndexAdapter.getClient().search({
      query: {
        bool: {
          must: [
            { term: { integration_id: integrationId } },
            { term: { data_stream_id: dataStreamId } },
          ],
        },
      },
      size: 500, // TODO: Make this configurable
      track_total_hits: false,
    });
    const samples: string[] = results.hits.hits.map(
      (hit) => (hit._source as AutomaticImportSamplesProperties).log_data
    );
    return samples;
  }
}
