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
import type { ResourceDefinition } from '../../../resources/types';

export interface ResourceInitializerOptions {
  esClient: ElasticsearchClient;
  resourceDefinition: ResourceDefinition;
}

function getEsErrorStatusCode(error: unknown): number | undefined {
  return isResponseError(error) ? error.statusCode : undefined;
}

const TOTAL_FIELDS_LIMIT = 2500;

export class ResourceInitializer {
  constructor(
    private readonly esClient: ElasticsearchClient,
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
      data_stream: {},
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
    } catch (e) {
      const status = getEsErrorStatusCode(e);

      if (status !== 400 && status !== 409) {
        throw e;
      }
    }
  }
}
