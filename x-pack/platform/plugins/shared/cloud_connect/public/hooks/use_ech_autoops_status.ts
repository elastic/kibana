/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UseCloudConnectStatusHook,
  UseCloudConnectStatusResult,
} from './use_cloud_connect_status';

/**
 * Static status for Elastic Cloud Hosted.
 * Avoids calling Cloud Connect APIs that are not registered on ESS/ECH.
 *
 * Only overrides AutoOps fields. Cloud Connect / EIS connection fields stay
 * disconnected so consumers like useEisPageState do not treat ECH as
 * "connected with EIS disabled by admin".
 */
export const createUseEchAutoOpsStatusHook = ({
  deploymentUrl,
  isAutoOpsEnabled = true,
}: {
  deploymentUrl?: string;
  isAutoOpsEnabled?: boolean;
} = {}): UseCloudConnectStatusHook => {
  const status: UseCloudConnectStatusResult = {
    isCloudConnected: false,
    isCloudConnectEisEnabled: false,
    isCloudConnectAutoopsEnabled: isAutoOpsEnabled,
    autoOpsServiceUrl: isAutoOpsEnabled ? deploymentUrl : undefined,
    isLoading: false,
    error: null,
  };

  return () => status;
};
