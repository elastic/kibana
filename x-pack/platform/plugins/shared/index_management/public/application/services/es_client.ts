/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClientPluginStart } from '@kbn/es-client-plugin/public';

export class EsClientService {
  private proxy!: EsClientPluginStart;

  public setup(esClient: EsClientPluginStart): void {
    this.proxy = esClient;
  }

  public get esClient(): EsClientPluginStart {
    return this.proxy;
  }
}

export const esClientService = new EsClientService();
