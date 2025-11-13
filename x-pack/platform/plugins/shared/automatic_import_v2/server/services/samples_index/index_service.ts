/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';
import type { DataStreamSamples } from '../../../common';
import type {
  AutomaticImportSamplesIndexAdapter,
  AutomaticImportSamplesProperties,
} from './storage';
import { createIndexAdapter } from './storage';

export class AutomaticImportSamplesIndexService {
  private logger: Logger;
  private samplesIndexAdapter: AutomaticImportSamplesIndexAdapter | null = null;

  constructor(logger: LoggerFactory, esClientPromise: Promise<ElasticsearchClient>) {
    this.logger = logger.get('samplesIndexService');
    void this.initialize(esClientPromise);
  }

  private async initialize(esClientPromise: Promise<ElasticsearchClient>) {
    const [esClient] = await Promise.all([esClientPromise]);
    // Initialize samples index adapter
    this.samplesIndexAdapter = createIndexAdapter({
      logger: this.logger,
      esClient,
    });
  }

  /**
   * Creates samples documents in the samples index.
   */
  public async addSamplesToDataStream(
    currentAuthenticatedUser: AuthenticatedUser,
    dataStream: DataStreamSamples
  ) {
    if (!this.samplesIndexAdapter) {
      throw new Error('Samples index adapter not initialized');
    }

    const operations = dataStream.logData.map((logData: string) => {
      const document: Omit<AutomaticImportSamplesProperties, '_id'> = {
        integration_id: dataStream.integrationId,
        data_stream_id: dataStream.dataStreamId,
        log_data: logData,
        created_by: currentAuthenticatedUser.username,
        original_filename: dataStream.originalFilename,
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

    return this.samplesIndexAdapter.getClient().bulk({ operations });
  }

  /**
   * Gets samples for a data stream
   * @param integrationId - The integration ID
   * @param dataStreamId - The data stream ID
   * @returns The samples for the data stream
   * @throws If the samples index adapter is not initialized
   */
  public async getSamplesForDataStream(integrationId: string, dataStreamId: string) {
    if (!this.samplesIndexAdapter) {
      throw new Error('Samples index adapter not initialized');
    }
    const results = await this.samplesIndexAdapter.getClient().search({
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
