/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { IndexResourceDefinition } from '../../../resources/indices/types';
import type { IResourceInitializer } from './resource_manager';

const INDEX_META = {
  managed: true,
  managed_by: 'alerting_v2',
} as const;

export class IndexInitializer implements IResourceInitializer {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly resourceDefinition: IndexResourceDefinition
  ) {}

  public async initialize(): Promise<void> {
    const { indexName, version, ilmPolicy, pipeline, mappings } = this.resourceDefinition;

    const versionedMappings: MappingTypeMapping = {
      ...(mappings as MappingTypeMapping),
      _meta: { ...INDEX_META, version },
    };

    await this.esClient.ilm.putLifecycle({
      name: ilmPolicy.name,
      policy: ilmPolicy.policy,
    });

    if (pipeline) {
      await this.esClient.ingest.putPipeline({
        id: pipeline.name,
        processors: pipeline.processors,
      });
    }

    const pipelineSetting = pipeline ? { 'index.default_pipeline': pipeline.name } : {};

    const exists = await this.esClient.indices.exists({ index: indexName });

    if (exists) {
      const currentVersion = await this.fetchIndexVersion(indexName);
      if (currentVersion === version) {
        this.logger.debug(`Index ${indexName} already at version ${version}, skipping update.`);
        return;
      }

      await this.esClient.indices.putMapping({
        index: indexName,
        ...versionedMappings,
      });
      if (pipeline) {
        await this.esClient.indices.putSettings({
          index: indexName,
          settings: pipelineSetting,
        });
      }
      this.logger.debug(`Index ${indexName} updated to version ${version}.`);
      return;
    }

    try {
      await this.esClient.indices.create({
        index: indexName,
        mappings: versionedMappings,
        settings: {
          'index.lifecycle.name': ilmPolicy.name,
          'index.hidden': true,
          ...pipelineSetting,
        },
      });
      this.logger.debug(`Index created: ${indexName} (version ${version})`);
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
      this.logger.debug(`Index already exists: ${indexName}`);
    }
  }

  private async fetchIndexVersion(indexName: string): Promise<number | null> {
    try {
      const response = await this.esClient.indices.getMapping({ index: indexName });
      const indexMapping = response[indexName];
      const meta = indexMapping?.mappings?._meta as { version?: number } | undefined;
      return meta?.version ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.debug(`Failed to fetch version for index ${indexName}: ${message}`);
      return null;
    }
  }
}
