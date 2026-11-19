/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { IResourceInitializer } from './resource_manager';

export interface EsqlViewDefinition {
  key: string;
  name: string;
  query: string;
}

export class ESQLViewInitializer implements IResourceInitializer {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly viewDefinition: EsqlViewDefinition
  ) {}

  public async initialize(): Promise<void> {
    const { name, query } = this.viewDefinition;

    this.logger.debug(`ESQLViewInitializer: Initializing view [${name}].`);

    await this.esClient.transport.request({
      method: 'PUT',
      path: `/_query/view/${name}`,
      body: { query },
    });
  }
}
