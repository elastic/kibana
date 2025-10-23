/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IndexSamples } from '../../../common';
import type {
  AutomaticImportSamplesIndexAdapter,
  AutomaticImportSamplesProperties,
} from './storage';
import { createIndexAdapter } from './storage';

export class AutomaticImportSamplesIndexService {
  private logger: Logger;
  private security: SecurityPluginStart | null = null;
  private samplesIndexAdapter: AutomaticImportSamplesIndexAdapter | null = null;
  private esClient: ElasticsearchClient | null = null;

  constructor(
    logger: LoggerFactory,
    esClientPromise: Promise<ElasticsearchClient>,
    securityPromise: Promise<SecurityPluginStart>
  ) {
    this.logger = logger.get('samplesIndexService');
    this.initialize(esClientPromise, securityPromise);
  }

  private async initialize(
    esClientPromise: Promise<ElasticsearchClient>,
    securityPromise: Promise<SecurityPluginStart>
  ) {
    const [esClient, security] = await Promise.all([esClientPromise, securityPromise]);
    this.esClient = esClient;
    this.security = security;

    // Initialize samples index adapter
    this.samplesIndexAdapter = createIndexAdapter({
      logger: this.logger,
      esClient: this.esClient,
    });
  }

  /**
   * Creates samples documents in the samples index.
   */
  public async createSamplesDocs(request: KibanaRequest, docs: Array<IndexSamples>) {
    if (!this.samplesIndexAdapter) {
      throw new Error('Samples index adapter not initialized');
    }

    const authenticatedUser = this.security?.authc.getCurrentUser(request);
    if (!authenticatedUser) {
      throw new Error('No user authenticated');
    }

    const operations = docs.map((sample) => {
      const document: Omit<AutomaticImportSamplesProperties, '_id'> = {
        integration_id: sample.integrationId,
        data_stream_id: sample.dataStreamId,
        ...(sample.projectId ? { project_id: sample.projectId } : {}),
        log_data: sample.logData,
        created_by: authenticatedUser.username,
        original_filename: sample.originalFilename,
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
}
