/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

import type { ReindexService } from '@kbn/reindex-service-plugin/public';
import type { ReindexArgs } from '@kbn/reindex-service-plugin/common';
import type { UpdateIndexOperation } from '../../../common/update_index';
import type {
  ESUpgradeStatus,
  CloudBackupStatus,
  ClusterUpgradeState,
  ResponseError,
  SystemIndicesMigrationStatus,
  DataStreamReindexStatusResponse,
  DataStreamMetadata,
} from '../../../common/types';
import {
  API_BASE_PATH,
  CLUSTER_UPGRADE_STATUS_POLL_INTERVAL_MS,
  DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS,
  CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS,
} from '../../../common/constants';
import {
  type UseRequestConfig,
  type SendRequestConfig,
  type SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';

type ClusterUpgradeStateListener = (clusterUpgradeState: ClusterUpgradeState) => void;

export class ApiService {
  private client: HttpSetup | undefined;
  private reindexService: ReindexService | undefined;
  private clusterUpgradeStateListeners: ClusterUpgradeStateListener[] = [];
  private lastClusterUpgradeErrorKey: string | null = null;

  private handleClusterUpgradeError(error: ResponseError | null) {
    const isClusterUpgradeError = Boolean(error && error.statusCode === 426);
    if (isClusterUpgradeError) {
      const clusterUpgradeState = error!.attributes!.allNodesUpgraded
        ? 'isUpgradeComplete'
        : 'isUpgrading';
      this.clusterUpgradeStateListeners.forEach((listener) => listener(clusterUpgradeState));
    }
  }

  private useRequest<R = any>(config: UseRequestConfig) {
    if (!this.client) {
      throw new Error('API service has not been initialized.');
    }
    const response = _useRequest<R, ResponseError>(this.client, config);
    // Avoid triggering synchronous render-phase updates. If we detect a cluster-upgrade error,
    // defer notifying listeners to the next macrotask tick.
    const upgradeError =
      response.error && response.error.statusCode === 426 ? response.error : null;
    const nextKey = upgradeError
      ? `${upgradeError.statusCode}:${Boolean(upgradeError.attributes?.allNodesUpgraded)}`
      : null;

    if (nextKey !== this.lastClusterUpgradeErrorKey) {
      this.lastClusterUpgradeErrorKey = nextKey;
      if (upgradeError) {
        setTimeout(() => this.handleClusterUpgradeError(upgradeError), 0);
      }
    }

    return response;
  }

  private async sendRequest<R = any>(
    config: SendRequestConfig
  ): Promise<SendRequestResponse<R, ResponseError>> {
    if (!this.client) {
      throw new Error('API service has not been initialized.');
    }
    const response = await _sendRequest<R, ResponseError>(this.client, config);
    this.handleClusterUpgradeError(response.error);
    return response;
  }

  public setup(httpClient: HttpSetup, reindexService: ReindexService): void {
    this.client = httpClient;
    this.reindexService = reindexService;
  }

  public onClusterUpgradeStateChange(listener: ClusterUpgradeStateListener) {
    this.clusterUpgradeStateListeners.push(listener);
  }

  public useLoadClusterUpgradeStatus() {
    return this.useRequest({
      path: `${API_BASE_PATH}/cluster_upgrade_status`,
      method: 'get',
      pollIntervalMs: CLUSTER_UPGRADE_STATUS_POLL_INTERVAL_MS,
    });
  }

  public useLoadCloudBackupStatus() {
    return this.useRequest<CloudBackupStatus>({
      path: `${API_BASE_PATH}/cloud_backup_status`,
      method: 'get',
      pollIntervalMs: CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS,
    });
  }

  public useLoadSystemIndicesMigrationStatus() {
    return this.useRequest<SystemIndicesMigrationStatus>({
      path: `${API_BASE_PATH}/system_indices_migration`,
      method: 'get',
    });
  }

  public async migrateSystemIndices() {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/system_indices_migration`,
      method: 'post',
    });

    return result;
  }

  public useLoadEsDeprecations() {
    return this.useRequest<ESUpgradeStatus>({
      path: `${API_BASE_PATH}/es_deprecations`,
      method: 'get',
    });
  }

  public useLoadDeprecationLogging() {
    return this.useRequest<{
      isDeprecationLogIndexingEnabled: boolean;
      isDeprecationLoggingEnabled: boolean;
    }>({
      path: `${API_BASE_PATH}/deprecation_logging`,
      method: 'get',
    });
  }

  public async updateDeprecationLogging(loggingData: { isEnabled: boolean }) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/deprecation_logging`,
      method: 'put',
      body: JSON.stringify(loggingData),
    });
  }

  public getDeprecationLogsCount(from: string) {
    return this.useRequest<{
      count: number;
    }>({
      path: `${API_BASE_PATH}/deprecation_logging/count`,
      method: 'get',
      query: { from },
      pollIntervalMs: DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS,
    });
  }

  public deleteDeprecationLogsCache() {
    return this.sendRequest({
      path: `${API_BASE_PATH}/deprecation_logging/cache`,
      method: 'delete',
    });
  }

  public async updateIndexSettings(indexName: string, settings: string[]) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/${indexName}/index_settings`,
      method: 'post',
      body: {
        settings: JSON.stringify(settings),
      },
    });
  }

  public async upgradeMlSnapshot(body: { jobId: string; snapshotId: string }) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots`,
      method: 'post',
      body,
    });
  }

  public async deleteMlSnapshot({ jobId, snapshotId }: { jobId: string; snapshotId: string }) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots/${jobId}/${snapshotId}`,
      method: 'delete',
    });
  }

  public async getMlSnapshotUpgradeStatus({
    jobId,
    snapshotId,
  }: {
    jobId: string;
    snapshotId: string;
  }) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots/${jobId}/${snapshotId}`,
      method: 'get',
    });
  }

  public useLoadMlUpgradeMode() {
    return this.useRequest<{
      mlUpgradeModeEnabled: boolean;
    }>({
      path: `${API_BASE_PATH}/ml_upgrade_mode`,
      method: 'get',
    });
  }

  /**
   * Data Stream Migrations
   * Reindex and readonly operations
   */

  public async getDataStreamMigrationStatus(dataStreamName: string) {
    return await this.sendRequest<DataStreamReindexStatusResponse>({
      path: `${API_BASE_PATH}/migrate_data_stream/${dataStreamName}`,
      method: 'get',
    });
  }

  public async getDataStreamMetadata(dataStreamName: string) {
    return await this.sendRequest<DataStreamMetadata>({
      path: `${API_BASE_PATH}/migrate_data_stream/${dataStreamName}/metadata`,
      method: 'get',
    });
  }

  public async startDataStreamReindexTask(dataStreamName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/migrate_data_stream/${dataStreamName}/reindex`,
      method: 'post',
    });
  }

  public async cancelDataStreamReindexTask(dataStreamName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/migrate_data_stream/${dataStreamName}/reindex/cancel`,
      method: 'post',
    });
  }

  public async markIndicesAsReadOnly(dataStreamName: string, indices: string[]) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/migrate_data_stream/${dataStreamName}/readonly`,
      method: 'post',
      body: { indices },
    });
  }

  /**
   * FINISH: Data Stream Migrations
   */

  public async getReindexStatus(indexName: string) {
    return this.reindexService!.getReindexStatus(indexName);
  }

  public async startReindexTask(reindexArgs: Omit<ReindexArgs, 'reindexOptions'>) {
    return this.reindexService!.startReindex({
      ...reindexArgs,
      reindexOptions: { enqueue: true, deleteOldIndex: true },
    });
  }
  public async cancelReindexTask(indexName: string) {
    return this.reindexService!.cancelReindex(indexName);
  }

  public async updateIndex(indexName: string, operations: UpdateIndexOperation[]) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/update_index/${indexName}`,
      method: 'post',
      body: { operations },
    });
  }

  public useLoadUpgradeStatus() {
    return this.useRequest<{
      readyForUpgrade: boolean;
      details: string;
    }>({
      path: `${API_BASE_PATH}/status`,
      method: 'get',
    });
  }

  public async updateClusterSettings(settings: string[]) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/cluster_settings`,
      method: 'post',
      body: {
        settings: JSON.stringify(settings),
      },
    });
  }

  public useLoadRemoteClusters() {
    return this.useRequest<string[]>({
      path: `${API_BASE_PATH}/remote_clusters`,
      method: 'get',
    });
  }

  public useLoadNodeDiskSpace() {
    return this.useRequest<
      Array<{
        nodeId: string;
        nodeName: string;
        available: string;
      }>
    >({
      path: `${API_BASE_PATH}/node_disk_space`,
      method: 'get',
    });
  }
}

export const apiService = new ApiService();
