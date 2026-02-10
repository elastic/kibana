/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient, type DataStreamDefinition } from '@kbn/data-streams';
import { Logger as LoggerToken } from '@kbn/core-di';
import type { Logger } from '@kbn/logging';
import { inject, injectable } from 'inversify';
import { isResponseError } from '@kbn/es-errors';
import type { ResourceDefinition } from '../../../resources/types';
import { EsServiceInternalToken } from '../es_service/tokens';

export interface IResourceInitializer {
  initialize(): Promise<void>;
}

export interface ResourceInitializerOptions {
  esClient: ElasticsearchClient;
  resourceDefinition: ResourceDefinition;
}

const TOTAL_FIELDS_LIMIT = 2500;

@injectable()
export class ResourceInitializer implements IResourceInitializer {
  constructor(
    @inject(LoggerToken) private readonly logger: Logger,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient,
    private readonly resourceDefinition: ResourceDefinition
  ) {}

  public async initialize(): Promise<void> {
    await this.esClient.ilm.putLifecycle({
      name: this.resourceDefinition.ilmPolicy.name,
      policy: this.resourceDefinition.ilmPolicy.policy,
    });

    const dataStreamDefinition: DataStreamDefinition<typeof this.resourceDefinition.mappings> = {
      name: this.resourceDefinition.dataStreamName,
      hidden: true,
      version: this.resourceDefinition.version,
      template: {
        aliases: {},
        priority: 500,
        mappings: this.resourceDefinition.mappings,
        settings: {
          'index.lifecycle.name': this.resourceDefinition.ilmPolicy.name,
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
        },
        _meta: {
          managed: true,
          description: `${this.resourceDefinition.dataStreamName} index template`,
        },
      },
    };

    try {
      await DataStreamClient.initialize({
        logger: this.logger,
        dataStream: dataStreamDefinition,
        elasticsearchClient: this.esClient,
      });
    } catch (error) {
      if (!isResponseError(error)) {
        throw error;
      }

      if (error.statusCode === 409) {
        this.logger.debug(`Data stream already exists: ${this.resourceDefinition.dataStreamName}.`);
        return;
      }

      throw error;
    }
  }
}
