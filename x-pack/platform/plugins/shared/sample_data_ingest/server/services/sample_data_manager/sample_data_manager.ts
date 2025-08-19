/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { DatasetSampleType } from '../../../common';
import { type StatusResponse, getSampleDataIndexName } from '../../../common';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';
import type { ZipArchive } from '../types';

interface SampleDataManagerOpts {
  artifactsFolder: string;
  logger: Logger;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
  elserInferenceId?: string;
  isServerlessPlatform: boolean;
}

export class SampleDataManager {
  private readonly log: Logger;
  private readonly artifactManager: ArtifactManager;
  private readonly indexManager: IndexManager;
  private isInstalling: boolean = false;

  constructor({
    artifactsFolder,
    logger,
    artifactRepositoryUrl,
    elserInferenceId,
    kibanaVersion,
    isServerlessPlatform,
  }: SampleDataManagerOpts) {
    this.log = logger;

    this.artifactManager = new ArtifactManager({
      artifactsFolder,
      artifactRepositoryUrl,
      kibanaVersion,
      logger: this.log,
    });

    this.indexManager = new IndexManager({
      elserInferenceId: elserInferenceId || defaultInferenceEndpoints.ELSER,
      logger: this.log,
      isServerlessPlatform,
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

    let archive: ZipArchive | undefined;
    const indexName = getSampleDataIndexName(sampleType);

    try {
      if ((await this.indexManager.hasIndex({ indexName, esClient })) || this.isInstalling) {
        this.log.warn(`Sample data already installed for [${sampleType}]`);
        return indexName;
      }

      this.isInstalling = true;

      const {
        archive: artifactsArchive,
        manifest,
        mappings,
      } = await this.artifactManager.prepareArtifact(sampleType);
      archive = artifactsArchive;

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
      await this.indexManager.deleteIndex({ indexName, esClient });
      this.log.error(
        `Sample data installation failed for [${sampleType}]: ${error?.message || error}`
      );
      throw error;
    } finally {
      try {
        archive?.close();
      } catch (e) {
        this.log.error(`Failed to close archive: ${e?.message || e}`);
      }

      await this.artifactManager.cleanup();
      this.isInstalling = false;
    }
  }

  async removeSampleData({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<void> {
    const indexName = getSampleDataIndexName(sampleType);
    await this.indexManager.deleteIndex({ indexName, esClient });
  }

  async getSampleDataStatus({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<StatusResponse> {
    const indexName = getSampleDataIndexName(sampleType);
    try {
      const hasIndex = await this.indexManager.hasIndex({ indexName, esClient });
      return {
        status: hasIndex ? 'installed' : 'uninstalled',
        indexName: hasIndex ? indexName : undefined,
      };
    } catch (error) {
      this.log.warn(`Failed to check sample data status for [${sampleType}]: ${error.message}`);
      return { status: 'uninstalled' };
    }
  }
}
