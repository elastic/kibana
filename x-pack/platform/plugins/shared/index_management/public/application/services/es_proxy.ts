/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsProxyPluginStart } from '@kbn/es-proxy-plugin/public';

export class EsProxyService {
  private proxy!: EsProxyPluginStart;

  public setup(esProxy: EsProxyPluginStart): void {
    this.proxy = esProxy;
  }

  public get esProxy(): EsProxyPluginStart {
    return this.proxy;
  }
}

export const esProxyService = new EsProxyService();
