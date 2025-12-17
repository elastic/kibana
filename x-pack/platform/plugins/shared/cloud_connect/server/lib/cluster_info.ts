/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InfoResponse, LicenseGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { OnboardClusterRequest } from '../types';

/**
 * Fetches cluster information from Elasticsearch
 * @param esClient - Elasticsearch client
 * @returns Cluster info including UUID, name, and version
 */
export async function getClusterInfo(esClient: ElasticsearchClient): Promise<InfoResponse> {
  try {
    return await esClient.info();
  } catch (error) {
    throw new Error(
      `Failed to fetch cluster information: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Fetches license information from Elasticsearch
 * @param esClient - Elasticsearch client
 * @returns License info including type and UID
 */
export async function getLicenseInfo(esClient: ElasticsearchClient): Promise<LicenseGetResponse> {
  try {
    return await esClient.license.get();
  } catch (error) {
    throw new Error(
      `Failed to fetch license information: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Builds cluster data object for Cloud Connect onboarding
 * Fetches cluster info and license from Elasticsearch and formats them for the API
 * @param esClient - Elasticsearch client
 * @returns Formatted cluster data ready for Cloud Connect API
 */
export async function getCurrentClusterData(
  esClient: ElasticsearchClient
): Promise<OnboardClusterRequest> {
  const [clusterInfo, licenseInfo] = await Promise.all([
    getClusterInfo(esClient),
    getLicenseInfo(esClient),
  ]);

  const clusterData: OnboardClusterRequest = {
    self_managed_cluster: {
      id: clusterInfo.cluster_uuid,
      name: clusterInfo.cluster_name || uuidv4(),
      version: clusterInfo.version.number,
    },
    license: {
      type: licenseInfo.license?.type || 'trial',
      uid: licenseInfo.license?.uid || '',
    },
  };

  return clusterData;
}
