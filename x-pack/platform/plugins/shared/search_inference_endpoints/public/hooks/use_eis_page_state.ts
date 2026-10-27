/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCloudConnectStatus } from '@kbn/search-api-panels';
import { useEisModels } from './use_eis_models';
import { useKibana } from './use_kibana';

export type EisPageState =
  | 'loading'
  | 'unavailable'
  | 'selfManagedEmpty'
  | 'serviceDisabled'
  | 'models';

interface EisPageStateResult {
  pageState: EisPageState;
  isCloudConnectPromoVisible: boolean;
}

export const useEisPageState = (): EisPageStateResult => {
  const {
    services: { cloud, cloudConnect },
  } = useKibana();
  const {
    isLoading: isCloudConnectStatusLoading,
    isCloudConnected,
    isCloudConnectEisEnabled,
    error: cloudConnectStatusError,
  } = useCloudConnectStatus(cloudConnect?.hooks.useCloudConnectStatus);
  const { data: endpoints, isLoading, isError } = useEisModels();

  const isCloudConnectPromoVisible = !isCloudConnectStatusLoading && !isCloudConnected;
  const isSelfManaged = !cloud?.isCloudEnabled;
  const hasEndpoints = Boolean(endpoints?.length);

  const getPageState = (): EisPageState => {
    if (isLoading) {
      return 'loading';
    }
    if (isError || (!hasEndpoints && !isSelfManaged)) {
      return 'unavailable';
    }
    if (!hasEndpoints) {
      const isCloudConnectStatusPending = Boolean(cloudConnect) && isCloudConnectStatusLoading;
      if (isCloudConnectStatusPending) {
        return 'loading';
      }
      const isCloudConnectDisconnected = isCloudConnectPromoVisible && !cloudConnectStatusError;
      if (isCloudConnectDisconnected) {
        return 'selfManagedEmpty';
      }
    }
    const isCloudConnectEisDisabled = isCloudConnected && !isCloudConnectEisEnabled;
    if (hasEndpoints && isCloudConnectEisDisabled) {
      return 'serviceDisabled';
    }
    return 'models';
  };

  return { pageState: getPageState(), isCloudConnectPromoVisible };
};
