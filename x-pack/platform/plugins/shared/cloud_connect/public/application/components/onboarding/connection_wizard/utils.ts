/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudConnectApiConfig } from '../../../../types';

interface ClusterQueryParams extends Partial<CloudConnectApiConfig> {
  organizationId?: string;
}

/**
 * Builds query parameters from cluster configuration for Cloud signup/login links
 */
export const buildClusterQueryParams = (clusterConfig?: ClusterQueryParams): string => {
  if (!clusterConfig) return '';

  const params = new URLSearchParams();

  if (clusterConfig.cluster?.id) {
    params.append('cluster_id', clusterConfig.cluster.id);
  }
  if (clusterConfig.cluster?.name) {
    params.append('cluster_name', clusterConfig.cluster.name);
  }
  if (clusterConfig.cluster?.version) {
    params.append('cluster_version', clusterConfig.cluster.version);
  }
  if (clusterConfig.license?.type) {
    params.append('license_type', clusterConfig.license.type);
  }
  if (clusterConfig.license?.uid) {
    params.append('license_uid', clusterConfig.license.uid);
  }

  if (clusterConfig.organizationId) {
    params.append('organization_id', clusterConfig.organizationId);
  }

  return params.toString();
};
