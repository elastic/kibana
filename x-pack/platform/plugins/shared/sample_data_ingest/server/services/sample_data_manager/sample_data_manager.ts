/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { DatasetSampleType } from '../../types';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';

interface SampleDataManagerOpts {
  artifactsFolder: string;
  logger: Logger;
  esClient: ElasticsearchClient;
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
  private esClient: ElasticsearchClient;

  constructor({
    artifactsFolder,
    logger,
    esClient,
    artifactRepositoryUrl,
    elserInferenceId,
    kibanaVersion,
    indexPrefixName,
  }: SampleDataManagerOpts) {
    this.esClient = esClient;
    this.log = logger;
    this.indexPrefixName = indexPrefixName;

    this.artifactManager = new ArtifactManager({
      artifactsFolder,
      artifactRepositoryUrl,
      kibanaVersion,
      logger: this.log.get('artifact-manager'),
    });

    this.indexManager = new IndexManager({
      esClient: this.esClient,
      elserInferenceId: elserInferenceId || defaultInferenceEndpoints.ELSER,
      logger: this.log.get('index-manager'),
    });
  }

  async installSampleData(sampleType: DatasetSampleType): Promise<string> {
    this.log.info(`Installing sample data for [${sampleType}]`);

    try {
      await this.removeSampleData({ sampleType });

      const { archive, manifest, mappings } = await this.artifactManager.prepareArtifact(
        sampleType
      );
      const indexName = this.getSampleDataIndexName(sampleType);

      await this.indexManager.createAndPopulateIndex({
        indexName,
        mappings,
        manifest,
        archive,
      });

      this.log.info(`Sample data installation successful for [${sampleType}]`);
      return indexName;
    } catch (error) {
      this.log.error(`Sample data installation failed for [${sampleType}]: ${error.message}`);
      throw error;
    }
  }

  async removeSampleData({ sampleType }: { sampleType: DatasetSampleType }): Promise<void> {
    const indexName = this.getSampleDataIndexName(sampleType);
    await this.indexManager.deleteIndex(indexName);
  }

  async getSampleDataStatus(sampleType: DatasetSampleType): Promise<boolean> {
    const indexName = this.getSampleDataIndexName(sampleType);
    try {
      const exists = await this.esClient.indices.exists({ index: indexName });
      return exists;
    } catch (error) {
      this.log.warn(`Failed to check sample data status for [${sampleType}]: ${error.message}`);
      return false;
    }
  }

  setESClient(esClient: ElasticsearchClient): void {
    this.esClient = esClient;
    this.indexManager.setESClient(esClient);
  }

  private getSampleDataIndexName(sampleType: DatasetSampleType): string {
    return `${this.indexPrefixName}-${sampleType.toLowerCase()}`;
  }
}
