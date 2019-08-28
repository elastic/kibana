/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest } from './adapters/framework';
import { InfraSources } from './sources';

export class InfraSourceStatus {
  constructor(
    private readonly adapter: InfraSourceStatusAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogIndexNames(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const indexNames = await this.adapter.getIndexNames(
      request,
      sourceConfiguration.configuration.logAlias
    );
    return indexNames;
  }
  public async getMetricIndexNames(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const indexNames = await this.adapter.getIndexNames(
      request,
      sourceConfiguration.configuration.metricAlias
    );
    return indexNames;
  }
  public async hasLogAlias(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const hasAlias = await this.adapter.hasAlias(
      request,
      sourceConfiguration.configuration.logAlias
    );
    return hasAlias;
  }
  public async hasMetricAlias(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const hasAlias = await this.adapter.hasAlias(
      request,
      sourceConfiguration.configuration.metricAlias
    );
    return hasAlias;
  }
  public async hasLogIndices(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const hasIndices = await this.adapter.hasIndices(
      request,
      sourceConfiguration.configuration.logAlias
    );
    return hasIndices;
  }
  public async hasMetricIndices(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const hasIndices = await this.adapter.hasIndices(
      request,
      sourceConfiguration.configuration.metricAlias
    );
    return hasIndices;
  }
}

export interface InfraSourceStatusAdapter {
  getIndexNames(request: InfraFrameworkRequest, aliasName: string): Promise<string[]>;
  hasAlias(request: InfraFrameworkRequest, aliasName: string): Promise<boolean>;
  hasIndices(request: InfraFrameworkRequest, indexNames: string): Promise<boolean>;
}
