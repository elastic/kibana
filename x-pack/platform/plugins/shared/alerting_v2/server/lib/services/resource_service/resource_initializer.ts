/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { isResponseError } from '@kbn/es-errors';
import { inject, injectable } from 'inversify';
import type { ResourceDefinition } from '../../../resources/types';
import { EsServiceInternalToken } from '../es_service/tokens';
import { LoggerService } from '../logger_service/logger_service';

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
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient,
    private readonly resourceDefinition: ResourceDefinition
  ) {}

  public async initialize(): Promise<void> {
    await this.esClient.ilm.putLifecycle({
      name: this.resourceDefinition.ilmPolicy.name,
      policy: this.resourceDefinition.ilmPolicy.policy,
    });

    const componentTemplateName = `${this.resourceDefinition.dataStreamName}-schema@component`;
    const indexTemplateName = `${this.resourceDefinition.dataStreamName}-schema@index-template`;

    const componentTemplate: ClusterPutComponentTemplateRequest = {
      name: componentTemplateName,
      template: {
        settings: { mode: 'lookup' },
        mappings: this.resourceDefinition.mappings,
      },
      _meta: {
        managed: true,
        description: `${this.resourceDefinition.dataStreamName} schema component template`,
      },
    };

    const indexTemplate: IndicesPutIndexTemplateRequest = {
      name: indexTemplateName,
      index_patterns: [this.resourceDefinition.dataStreamName],
      data_stream: { hidden: true },
      composed_of: [componentTemplateName],
      priority: 500,
      template: {
        settings: {
          'index.lifecycle.name': this.resourceDefinition.ilmPolicy.name,
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
        },
      },
      _meta: {
        managed: true,
        description: `${this.resourceDefinition.dataStreamName} index template`,
      },
    };

    await this.esClient.cluster.putComponentTemplate(componentTemplate);
    await this.esClient.indices.putIndexTemplate(indexTemplate);

    try {
      await this.esClient.indices.createDataStream({
        name: this.resourceDefinition.dataStreamName,
      });
    } catch (error) {
      if (!isResponseError(error)) {
        throw error;
      }

      if (isResourceAlreadyExistsException(error)) {
        this.logger.debug({
          message: `Data stream already exists: ${this.resourceDefinition.dataStreamName}`,
        });

        return;
      }

      throw error;
    }
  }
}

const isResourceAlreadyExistsException = (error: unknown): boolean => {
  return (
    isResponseError(error) &&
    ((error.statusCode === 400 && error.body?.error.type === 'resource_already_exists_exception') ||
      error.statusCode === 409)
  );
};
