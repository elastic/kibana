/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { ClusterDetails } from '../types';
import {
  type UseRequestConfig,
  type SendRequestConfig,
  type SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';

const API_BASE_PATH = '/internal/cloud_connect';

export interface CloudConnectConfig {
  hasEncryptedSOEnabled: boolean;
}

export interface UpdateServicesResponse {
  success: boolean;
  warning?: string;
  warningError?: string;
}

export interface AuthenticateResponse {
  success: boolean;
  cluster_id: string;
  organization_id: string;
  message: string;
}

export interface DisconnectClusterResponse {
  success: boolean;
  message: string;
}

export class ApiService {
  private client: HttpSetup | undefined;

  private useRequest<R = any, E = any>(config: UseRequestConfig) {
    if (!this.client) {
      throw new Error('API service has not been initialized.');
    }
    return _useRequest<R, E>(this.client, config);
  }

  private async sendRequest<R = any, E = any>(
    config: SendRequestConfig
  ): Promise<SendRequestResponse<R, E>> {
    if (!this.client) {
      throw new Error('API service has not been initialized.');
    }
    return await _sendRequest<R, E>(this.client, config);
  }

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
  }

  public useLoadConfig() {
    return this.useRequest<CloudConnectConfig>({
      path: `${API_BASE_PATH}/config`,
      method: 'get',
    });
  }

  public useLoadClusterDetails() {
    return this.useRequest<ClusterDetails>({
      path: `${API_BASE_PATH}/cluster_details`,
      method: 'get',
    });
  }

  public async authenticate(apiKey: string) {
    return await this.sendRequest<AuthenticateResponse>({
      path: `${API_BASE_PATH}/authenticate`,
      method: 'post',
      body: JSON.stringify({ apiKey }),
    });
  }

  public async updateServices(services: Record<string, { enabled: boolean }>) {
    return await this.sendRequest<UpdateServicesResponse>({
      path: `${API_BASE_PATH}/cluster_details`,
      method: 'put',
      body: JSON.stringify({ services }),
    });
  }

  public async disconnectCluster() {
    return await this.sendRequest<DisconnectClusterResponse>({
      path: `${API_BASE_PATH}/cluster`,
      method: 'delete',
    });
  }
}

export const apiService = new ApiService();
