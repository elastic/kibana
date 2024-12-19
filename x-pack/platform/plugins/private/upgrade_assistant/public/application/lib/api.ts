/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';

import {
  ESUpgradeStatus,
  CloudBackupStatus,
  ClusterUpgradeState,
  ResponseError,
  SystemIndicesMigrationStatus,
  ReindexStatusResponse,
} from '../../../common/types';
import {
  API_BASE_PATH,
  CLUSTER_UPGRADE_STATUS_POLL_INTERVAL_MS,
  DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS,
  CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS,
} from '../../../common/constants';
import {
  UseRequestConfig,
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';

type ClusterUpgradeStateListener = (clusterUpgradeState: ClusterUpgradeState) => void;

export class ApiService {
  private client: HttpSetup | undefined;
  private clusterUpgradeStateListeners: ClusterUpgradeStateListener[] = [];

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
    // NOTE: This will cause an infinite render loop in any component that both
    // consumes the hook calling this useRequest function and also handles
    // cluster upgrade errors. Note that sendRequest doesn't have this problem.
    //
    // This is due to React's fundamental expectation that hooks be idempotent,
    // so it can render a component as many times as necessary and thereby call
    // the hook on each render without worrying about that triggering subsequent
    // renders.
    //
    // In this case we call handleClusterUpgradeError every time useRequest is
    // called, which is on every render. If handling the cluster upgrade error
    // causes a state change in the consuming component, that will trigger a
    // render, which will call useRequest again, calling handleClusterUpgradeError,
    // causing a state change in the consuming component, and so on.
    this.handleClusterUpgradeError(response.error);
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

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
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

  public async getReindexStatus(indexName: string) {
    return await this.sendRequest<ReindexStatusResponse>({
      path: `${API_BASE_PATH}/reindex/${indexName}`,
      method: 'get',
    });
  }

  public async startReindexTask(indexName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/reindex/${indexName}`,
      method: 'post',
    });
  }

  public async cancelReindexTask(indexName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/reindex/${indexName}/cancel`,
      method: 'post',
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
        lowDiskWatermarkSetting: string;
      }>
    >({
      path: `${API_BASE_PATH}/node_disk_space`,
      method: 'get',
    });
  }
}

export const apiService = new ApiService();
