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
import type { ResourceDefinition } from '../../../resources/datastreams/types';
import type { IResourceInitializer } from './resource_manager';
import { EsServiceInternalToken } from '../es_service/tokens';
import { computeMappingHash } from './mapping_hash';

const TOTAL_FIELDS_LIMIT = 2500;

interface ExistingTemplateMeta {
  version: unknown;
  mappingHash: unknown;
}

@injectable()
export class DatastreamInitializer implements IResourceInitializer {
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

    const existingTemplate = await this.getExistingTemplate();
    const mappingHash = computeMappingHash(this.resourceDefinition.mappings.properties ?? {});
    const version = this.resolveVersion(existingTemplate, mappingHash);

    const dataStreamDefinition: DataStreamDefinition<typeof this.resourceDefinition.mappings> = {
      name: this.resourceDefinition.dataStreamName,
      hidden: true,
      version,
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
          mappingHash,
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

  private async getExistingTemplate(): Promise<ExistingTemplateMeta | undefined> {
    try {
      const { index_templates: templates } = await this.esClient.indices.getIndexTemplate({
        name: this.resourceDefinition.dataStreamName,
      });

      const meta = templates[0]?.index_template?._meta;

      if (!meta) {
        return undefined;
      }

      return { version: meta.version, mappingHash: meta.mappingHash };
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }

      throw error;
    }
  }

  /**
   * Resolves the effective version to pass to DataStreamClient.
   *
   * Compares the current mapping hash against the deployed one. If the hashes
   * differ the version is auto-incremented past the deployed version so that
   * DataStreamClient's `deployedVersion >= version` gate is satisfied and the
   * updated mappings are applied.
   */
  private resolveVersion(
    existingTemplate: ExistingTemplateMeta | undefined,
    mappingHash: string
  ): number {
    if (!existingTemplate) {
      return this.resourceDefinition.version;
    }

    const { version: deployedVersion, mappingHash: deployedHash } = existingTemplate;

    if (typeof deployedVersion !== 'number' || deployedVersion <= 0) {
      return this.resourceDefinition.version;
    }

    if (deployedHash === mappingHash) {
      return deployedVersion;
    }

    const nextVersion = deployedVersion + 1;

    this.logger.debug(
      `Mapping hash changed for ${this.resourceDefinition.dataStreamName}, ` +
        `bumping version from ${deployedVersion} to ${nextVersion}.`
    );

    return Math.max(this.resourceDefinition.version, nextVersion);
  }
}
