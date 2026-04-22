/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isResponseError } from '@kbn/es-errors';
import type { IndexResourceDefinition } from '../../../resources/indices/rule_doctor_findings';
import type { IResourceInitializer } from './resource_manager';

export class IndexInitializer implements IResourceInitializer {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly resourceDefinition: IndexResourceDefinition
  ) {}

  public async initialize(): Promise<void> {
    await this.esClient.ilm.putLifecycle({
      name: this.resourceDefinition.ilmPolicy.name,
      policy: this.resourceDefinition.ilmPolicy.policy,
    });

    if (this.resourceDefinition.pipeline) {
      await this.esClient.ingest.putPipeline({
        id: this.resourceDefinition.pipeline.name,
        processors: this.resourceDefinition.pipeline.processors,
      });
    }

    const pipelineSetting = this.resourceDefinition.pipeline
      ? { 'index.default_pipeline': this.resourceDefinition.pipeline.name }
      : {};

    const exists = await this.esClient.indices.exists({
      index: this.resourceDefinition.indexName,
    });

    if (exists) {
      await this.esClient.indices.putMapping({
        index: this.resourceDefinition.indexName,
        ...this.resourceDefinition.mappings,
      });
      if (this.resourceDefinition.pipeline) {
        await this.esClient.indices.putSettings({
          index: this.resourceDefinition.indexName,
          settings: pipelineSetting,
        });
      }
      this.logger.debug(`Index already exists: ${this.resourceDefinition.indexName}, mappings updated.`);
      return;
    }

    try {
      await this.esClient.indices.create({
        index: this.resourceDefinition.indexName,
        mappings: this.resourceDefinition.mappings,
        settings: {
          'index.lifecycle.name': this.resourceDefinition.ilmPolicy.name,
          'index.hidden': true,
          ...pipelineSetting,
        },
      });
      this.logger.debug(`Index created: ${this.resourceDefinition.indexName}`);
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 400 && String(error.body).includes('resource_already_exists_exception')) {
        this.logger.debug(`Index already exists (race condition): ${this.resourceDefinition.indexName}`);
        return;
      }
      throw error;
    }
  }
}
