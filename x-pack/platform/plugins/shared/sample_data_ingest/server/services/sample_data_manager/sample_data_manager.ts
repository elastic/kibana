/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClient,
  ISavedObjectsImporter,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { DatasetSampleType } from '../../../common';
import { type StatusResponse, getSampleDataIndexName } from '../../../common';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';
import { SavedObjectsManager } from '../saved_objects_manager';
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
  private readonly savedObjectsManager: SavedObjectsManager;
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

    this.savedObjectsManager = new SavedObjectsManager({
      logger: this.log,
    });
  }

  async installSampleData({
    sampleType,
    esClient,
    soClient,
    soImporter,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    soImporter: ISavedObjectsImporter;
  }): Promise<{ indexName: string; dashboardId?: string }> {
    this.log.info(`Installing sample data for [${sampleType}]`);

    let archive: ZipArchive | undefined;
    const indexName = getSampleDataIndexName(sampleType);

    try {
      const status = await this.getSampleDataStatus({ sampleType, esClient, soClient });
      if (status.status === 'installed' || this.isInstalling) {
        this.log.warn(`Sample data already installed for [${sampleType}]`);

        return { indexName, dashboardId: status.dashboardId };
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

      const { dashboardId } = await this.savedObjectsManager.importSavedObjects(
        soImporter,
        sampleType
      );

      return { indexName, dashboardId };
    } catch (error) {
      await this.indexManager.deleteIndex({ indexName, esClient });
      await this.savedObjectsManager.deleteSavedObjects(soClient, sampleType);
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
    soClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
    soClient?: SavedObjectsClientContract;
  }): Promise<void> {
    const indexName = getSampleDataIndexName(sampleType);
    await this.indexManager.deleteIndex({ indexName, esClient });

    if (soClient) {
      await this.savedObjectsManager.deleteSavedObjects(soClient, sampleType);
    }
  }

  async getSampleDataStatus({
    sampleType,
    esClient,
    soClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
  }): Promise<StatusResponse> {
    const indexName = getSampleDataIndexName(sampleType);
    try {
      const hasIndex = await this.indexManager.hasIndex({ indexName, esClient });
      const dashboardId = await this.savedObjectsManager.getDashboardId(soClient, sampleType);
      if (hasIndex) {
        return {
          status: 'installed',
          indexName,
          dashboardId,
        };
      }
      return { status: 'uninstalled' };
    } catch (error) {
      this.log.warn(`Failed to check sample data status for [${sampleType}]: ${error.message}`);
      return { status: 'uninstalled' };
    }
  }
}
