/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../common/constants';
import type { ClusterDetails } from '../types';
import { toAutoOpsDeploymentUrl } from '../lib/autoops_url';

export interface UseCloudConnectStatusResult {
  isCloudConnected: boolean;
  isCloudConnectEisEnabled: boolean;
  isCloudConnectAutoopsEnabled: boolean;
  /**
   * The URL to the AutoOps service page for this cluster. On ECE this is rewritten to a
   * deployment-scoped URL using `cloud.deploymentId`; on self-managed clusters it is the raw
   * `metadata.service_url` from the Cloud Connect API response.
   */
  autoOpsServiceUrl?: string;
  /** The URL to the AutoOps documentation, from `metadata.documentation_url`. */
  autoOpsDocsUrl?: string;
  isLoading: boolean;
  error: Error | null;
}

export type UseCloudConnectStatusHook = () => UseCloudConnectStatusResult;

export const createUseCloudConnectStatusHook = ({
  http,
  deploymentId,
}: {
  http: HttpSetup;
  /** The ECE deployment id (`cloud.deploymentId`). When present the AutoOps link is rewritten
   * from the cluster-scoped `/clusters/{id}/cluster` path to `/deployments/{id}/deployment`. */
  deploymentId?: string;
}): UseCloudConnectStatusHook => {
  return () => {
    const [{ error, loading, value }, load] = useAsyncFn(async () => {
      try {
        return await http.get<ClusterDetails>(`${API_BASE_PATH}/cluster_details`);
      } catch (err) {
        // 503 means not connected to cloud, so not really an error state
        if (err?.response?.status === 503) {
          return null;
        }
        throw err;
      }
    });

    useEffect(() => {
      load();
    }, [load]);

    return {
      isCloudConnected: value != null,
      isCloudConnectEisEnabled: value?.services?.eis?.enabled ?? false,
      isCloudConnectAutoopsEnabled: value?.services?.auto_ops?.enabled ?? false,
      autoOpsServiceUrl: toAutoOpsDeploymentUrl(
        value?.services?.auto_ops?.metadata?.service_url,
        deploymentId
      ),
      autoOpsDocsUrl: value?.services?.auto_ops?.metadata?.documentation_url,
      isLoading: loading,
      error: error ?? null,
    };
  };
};
