/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudConnectedAppContextValue } from '../../../app_context';

/**
 * Builds query parameters from cluster configuration for Cloud signup/login links
 */
export const buildClusterQueryParams = (
  clusterConfig?: CloudConnectedAppContextValue['clusterConfig']
): string => {
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

  return params.toString();
};
