/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  ElasticsearchClient,
  KibanaRequest,
  LoggerFactory,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { DataStreamSamples } from '../../common';
import { AutomaticImportSamplesIndexService } from './samples_index/index_service';
import { getAuthenticatedUser } from './lib/get_user';

export class AutomaticImportService {
  private pluginStop$: Subject<void>;
  private samplesIndexService: AutomaticImportSamplesIndexService;
  private security?: SecurityServiceStart;

  constructor(logger: LoggerFactory, esClientPromise: Promise<ElasticsearchClient>) {
    this.pluginStop$ = new ReplaySubject(1);
    this.samplesIndexService = new AutomaticImportSamplesIndexService(logger, esClientPromise);
  }

  public setSecurityService(security: SecurityServiceStart) {
    this.security = security;
  }

  public async addSamplesToDataStream(dataStream: DataStreamSamples, request: KibanaRequest) {
    const currentAuthenticatedUser = getAuthenticatedUser(request, this.security);
    await this.samplesIndexService.addSamplesToDataStream(currentAuthenticatedUser, dataStream);
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
    // Should we remove the samples index when the plugin stops?
  }
}
