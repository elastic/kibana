/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../../common/constants';
import type { Cluster, ClusterPayload } from '../../../common/lib';

let _httpClient: HttpSetup;

export interface SendGetOptions {
  asSystemRequest?: boolean;
}

/**
 * Response from the delete clusters endpoint
 */
export interface DeleteClustersResponse {
  itemsDeleted: string[];
  errors: Array<{
    name: string;
    error: {
      payload: {
        message: string;
      };
    };
  }>;
}

/**
 * Remote cluster with additional UI-specific properties
 */
export type RemoteCluster = Cluster & {
  isConfiguredByNode?: boolean;
};

export interface AddClusterResponse {
  acknowledged: boolean;
}

export function init(httpClient: HttpSetup): void {
  _httpClient = httpClient;
}

export function getFullPath(path?: string): string {
  if (path) {
    return `${API_BASE_PATH}/${path}`;
  }

  return API_BASE_PATH;
}

export function sendPost(path: string, payload: ClusterPayload): Promise<AddClusterResponse> {
  return _httpClient.post(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendGet(
  path?: string,
  { asSystemRequest }: SendGetOptions = {}
): Promise<RemoteCluster[]> {
  return _httpClient.get(getFullPath(path), { asSystemRequest });
}

export function sendPut(
  path: string,
  payload: Omit<ClusterPayload, 'name'>
): Promise<RemoteCluster> {
  return _httpClient.put(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendDelete(path: string): Promise<DeleteClustersResponse> {
  return _httpClient.delete(getFullPath(path));
}
