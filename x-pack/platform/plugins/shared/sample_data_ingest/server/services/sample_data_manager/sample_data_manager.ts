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
import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { DatasetSampleType } from '../../../common';
import { getSampleDataIndexName, type StatusResponse } from '../../../common';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';
import { SavedObjectsManager } from '../saved_objects_manager';
import { getInstallTaskId, type InstallSampleDataTaskState } from '../../tasks/install_sample_data';
import type { ZipArchive } from '../types';

interface SampleDataManagerOpts {
  artifactsFolder: string;
  logger: Logger;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
  elserInferenceId?: string;
  isServerlessPlatform: boolean;
  taskManager?: TaskManagerStartContract;
}

export class SampleDataManager {
  private readonly log: Logger;
  private readonly artifactManager: ArtifactManager;
  private readonly indexManager: IndexManager;
  private readonly savedObjectsManager: SavedObjectsManager;
  private readonly taskManager?: TaskManagerStartContract;
  private isInstalling: boolean = false;

  constructor({
    artifactsFolder,
    logger,
    artifactRepositoryUrl,
    elserInferenceId,
    kibanaVersion,
    isServerlessPlatform,
    taskManager,
  }: SampleDataManagerOpts) {
    this.log = logger;
    this.taskManager = taskManager;

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
    abortController,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    soImporter: ISavedObjectsImporter;
    abortController?: AbortController;
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
      } = await this.artifactManager.prepareArtifact(sampleType, abortController);
      archive = artifactsArchive;

      await this.indexManager.createAndPopulateIndex({
        indexName,
        mappings,
        manifest,
        archive,
        esClient,
        abortController,
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
    try {
      if (this.taskManager) {
        const taskId = getInstallTaskId(sampleType);

        try {
          const task = await this.taskManager.get(taskId);
          const taskState = (task.state ?? {}) as InstallSampleDataTaskState;
          const runAtTime = task.runAt ? new Date(task.runAt).getTime() : undefined;
          const retryAtTime = task.retryAt ? new Date(task.retryAt).getTime() : undefined;

          if (
            task.status === TaskStatus.Failed ||
            task.status === TaskStatus.DeadLetter ||
            taskState.status === 'error'
          ) {
            const taskErrorMessage =
              taskState.errorMessage ||
              (task as { taskRunError?: { message?: string } }).taskRunError?.message ||
              (task as { error?: { message?: string } }).error?.message;

            return {
              status: 'error',
              taskId,
              error: taskErrorMessage,
            };
          }

          const isInFlight =
            task.status === TaskStatus.Claiming || task.status === TaskStatus.Running;

          const hasPendingRun =
            task.status === TaskStatus.Idle &&
            (runAtTime !== undefined || retryAtTime !== undefined);

          if (
            (isInFlight || hasPendingRun || taskState.status === 'pending') &&
            taskState.status !== 'completed'
          ) {
            return {
              status: 'installing',
              taskId,
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          const statusCode =
            (error as { statusCode?: number }).statusCode ??
            (error as { output?: { statusCode?: number } }).output?.statusCode;

          if (statusCode && statusCode !== 404) {
            this.log.error(
              `Failed to check sample data task status for [${sampleType}]: ${errorMessage}`
            );
          }

          this.log.debug(`Task ${taskId} not found or error getting it: ${errorMessage}`);
        }
      }

      const isInstalled = await this.isSampleDataInstalled({ sampleType, esClient });

      if (isInstalled) {
        const indexName = getSampleDataIndexName(sampleType);
        const dashboardId = await this.savedObjectsManager.getDashboardId(soClient, sampleType);

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

  async isSampleDataInstalled({
    sampleType,
    esClient,
  }: {
    sampleType: DatasetSampleType;
    esClient: ElasticsearchClient;
  }): Promise<boolean> {
    const indexName = getSampleDataIndexName(sampleType);

    try {
      return await this.indexManager.hasIndex({ indexName, esClient });
    } catch (error) {
      this.log.warn(
        `Failed to check if sample data is installed for [${sampleType}]: ${error.message}`
      );
      return false;
    }
  }
}
