/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, type Subject } from 'rxjs';
import type { ElasticsearchClient, LoggerFactory } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { AutomaticImportSamplesIndexService } from './samples_index/index_service';

export class AutomaticImportService {
  private pluginStop$: Subject<void>;
  private samplesIndexService: AutomaticImportSamplesIndexService;

  constructor(
    logger: LoggerFactory,
    esClientPromise: Promise<ElasticsearchClient>,
    securityPromise: Promise<SecurityPluginStart>
  ) {
    this.pluginStop$ = new ReplaySubject(1);
    this.samplesIndexService = new AutomaticImportSamplesIndexService(
      logger,
      esClientPromise,
      securityPromise
    );
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
