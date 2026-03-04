/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Logger as LoggerToken } from '@kbn/core-di';
import type { Logger } from '@kbn/logging';
import { inject, injectable } from 'inversify';
import type { EsqlViewDefinition } from '../../../resources/types';
import { EsServiceInternalToken } from '../es_service/tokens';

@injectable()
export class ESQLViewInitializer {
  constructor(
    @inject(LoggerToken) private readonly logger: Logger,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  private async _initialize({ name, query }: EsqlViewDefinition): Promise<void> {
    await this.esClient.transport.request({
      method: 'PUT',
      path: `/_query/view/${name}`,
      body: { query },
    });
  }

  /**
   * Trigger async initialization for a set of views.
   */
  public startInitialization({ viewDefinitions }: { viewDefinitions: EsqlViewDefinition[] }): void {
    for (const view of viewDefinitions) {
      // Fire-and-forget: initialization errors must NOT become unhandled rejections (which would crash Kibana).
      void this._initialize(view).catch((error) => {
        this.logger.debug(
          `EsqlViewInitializer: Initialization for view [${view.key}] failed. Error: ${error.message}`
        );
      });
    }
  }
}
