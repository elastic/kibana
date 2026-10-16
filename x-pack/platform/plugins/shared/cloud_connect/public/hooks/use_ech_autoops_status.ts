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

export const createUseEchAutoOpsStatusHook = (
  deploymentUrl?: string
): UseCloudConnectStatusHook => {
  const status: UseCloudConnectStatusResult = {
    isCloudConnected: true,
    isCloudConnectEisEnabled: false,
    isCloudConnectAutoopsEnabled: true,
    autoOpsServiceUrl: deploymentUrl,
    isLoading: false,
    error: null,
  };

  return () => status;
};
