/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { DatasetSampleType, type StatusResponse } from '../../../common/types';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';

interface SampleDataManagerOpts {
  artifactsFolder: string;
  logger: Logger;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
  elserInferenceId?: string;
  indexPrefixName: string;
}

export class SampleDataManager {
  private readonly log: Logger;
  private readonly artifactManager: ArtifactManager;
  private readonly indexManager: IndexManager;
  private readonly indexPrefixName: string;

  constructor({
    artifactsFolder,
    logger,
    artifactRepositoryUrl,
    elserInferenceId,
    kibanaVersion,
    indexPrefixName,
  }: SampleDataManagerOpts) {
    this.log = logger;
    this.indexPrefixName = indexPrefixName;

    this.artifactManager = new ArtifactManager({
      artifactsFolder,
      artifactRepositoryUrl,
      kibanaVersion,
      logger: this.log.get('artifact-manager'),
    });

    this.indexManager = new IndexManager({
      elserInferenceId: elserInferenceId || defaultInferenceEndpoints.ELSER,
      logger: this.log.get('index-manager'),
    });
  }

  async installSampleData({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<string> {
    this.log.info(`Installing sample data for [${sampleType}]`);

    try {
      await this.removeSampleData({ sampleType, esClient });

      const { archive, manifest, mappings } = await this.artifactManager.prepareArtifact(
        sampleType
      );
      const indexName = this.getSampleDataIndexName(sampleType);

      await this.indexManager.createAndPopulateIndex({
        indexName,
        mappings,
        manifest,
        archive,
        esClient,
      });

      this.log.info(`Sample data installation successful for [${sampleType}]`);
      return indexName;
    } catch (error) {
      this.log.error(
        `Sample data installation failed for [${sampleType}]: ${error?.message || error}`
      );
      throw error;
    }
  }

  async removeSampleData({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<void> {
    const indexName = this.getSampleDataIndexName(sampleType);
    await this.indexManager.deleteIndex({ indexName, esClient });
  }

  async getSampleDataStatus({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<StatusResponse> {
    const indexName = this.getSampleDataIndexName(sampleType);
    try {
      const isIndexExists = await esClient.indices.exists({ index: indexName });
      return {
        status: isIndexExists ? 'installed' : 'uninstalled',
        indexName: isIndexExists ? indexName : undefined,
      };
    } catch (error) {
      this.log.warn(`Failed to check sample data status for [${sampleType}]: ${error.message}`);
      return { status: 'uninstalled' };
    }
  }

  private getSampleDataIndexName(sampleType: DatasetSampleType): string {
    return `${this.indexPrefixName}-${sampleType.toLowerCase()}`;
  }
}
