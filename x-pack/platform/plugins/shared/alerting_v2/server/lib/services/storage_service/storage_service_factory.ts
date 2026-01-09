/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core/server';
import { CoreStart } from '@kbn/core-di-server';
import { StorageService } from './storage_service';
import { LoggerService } from '../logger_service';

@injectable()
export class StorageServiceFactory {
  constructor(
    @inject(CoreStart('elasticsearch')) private readonly elasticsearch: ElasticsearchServiceStart,
    @inject(LoggerService) private readonly loggerService: LoggerService
  ) {}

  public createAsScoped(request: KibanaRequest): StorageService {
    const esClient = this.elasticsearch.client.asScoped(request).asCurrentUser;
    return new StorageService(esClient, this.loggerService);
  }

  public createAsInternal(): StorageService {
    const esClient = this.elasticsearch.client.asInternalUser;
    return new StorageService(esClient, this.loggerService);
  }
}
