/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest } from '@kbn/core-http-server';
import { PluginStart } from '@kbn/core-di';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { QueryService } from './query_service';
import { LoggerService } from '../logger_service';

@injectable()
export class QueryServiceFactory {
  constructor(
    @inject(PluginStart('data')) private readonly data: DataPluginStart,
    @inject(LoggerService) private readonly loggerService: LoggerService
  ) {}

  public createAsScoped(request: KibanaRequest): QueryService {
    const searchClient = this.data.search.asScoped(request);
    return new QueryService(searchClient, this.loggerService);
  }
}
