/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../common/constants';
import type { ClusterDetails, CloudConnectApiConfig } from '../types';
import {
  type UseRequestConfig,
  type SendRequestConfig,
  type SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';

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

export interface RotateApiKeyResponse {
  success: boolean;
  message: string;
}

export class CloudConnectApiService {
  constructor(private readonly client: HttpSetup) {}

  private useRequest<R = any, E = any>(config: UseRequestConfig) {
    return _useRequest<R, E>(this.client, config);
  }

  private async sendRequest<R = any, E = any>(
    config: SendRequestConfig
  ): Promise<SendRequestResponse<R, E>> {
    return await _sendRequest<R, E>(this.client, config);
  }

  public useLoadConfig() {
    return this.useRequest<CloudConnectApiConfig>({
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

  public async rotateApiKey() {
    return await this.sendRequest<RotateApiKeyResponse>({
      path: `${API_BASE_PATH}/cluster/rotate_api_key`,
      method: 'post',
    });
  }

  public async rotateServiceApiKey(serviceKey: string) {
    return await this.sendRequest<RotateApiKeyResponse>({
      path: `${API_BASE_PATH}/cluster/${serviceKey}/rotate_api_key`,
      method: 'post',
    });
  }
}
