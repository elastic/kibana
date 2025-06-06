/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
    KibanaRequest,
    Logger,
    ElasticsearchServiceStart,
  } from '@kbn/core/server';
  import { EsqlToolClient, createClient } from './client';
  import { createStorage } from './storage';
  
  export interface EsqlToolService {
    getClient(options: { request: KibanaRequest }): Promise<EsqlToolClient>;
  }
  
  export class EsqlToolServiceImpl implements EsqlToolService {
    private readonly logger: Logger;
    private readonly elasticsearch: ElasticsearchServiceStart;
  
    constructor({
      logger,
      elasticsearch,
    }: {
      logger: Logger;
      elasticsearch: ElasticsearchServiceStart;
    }) {
      this.logger = logger;
      this.elasticsearch = elasticsearch;
    }
  
    async getClient({ request }: { request: KibanaRequest }): Promise<EsqlToolClient> {
        try {
            const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
            const storage = createStorage({ 
                logger: this.logger, 
                esClient,
            });
            const client = createClient({ storage, esClient });
            return client;
        } catch (error) {
            this.logger.error('Failed to create ESQL tool client:' + error);
            throw error;
            }
        }
    }   