/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  useCloudConnectedAppContext,
  CloudConnectedAppContextProvider,
  type CloudConnectedAppContextValue,
} from './app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage, useClusterConnection } from './components/connected_services';

export const CloudConnectedAppMain: React.FC = () => {
  useBreadcrumbs();
  const appContext = useCloudConnectedAppContext();

  const { notifications, apiService } = appContext;
  const { data: config, isLoading: isConfigLoading } = apiService.useLoadConfig();
  const {
    clusterDetails,
    isLoading: isClusterLoading,
    error: clusterError,
    handleServiceUpdate,
    handleDisconnect,
    handleConnect,
  } = useClusterConnection();

  // Show error toast for cluster loading failures, except for 503.
  // 503 is the expected state when a cluster hasn't been connected to Cloud Connect
  // yet, so we show the onboarding page instead.
  useEffect(() => {
    if (clusterError && clusterError.statusCode !== 503) {
      notifications.toasts.addError(clusterError as Error, {
        title: 'Failed to load cluster details',
      });
    }
  }, [clusterError, notifications.toasts]);

  const isLoading = isConfigLoading || (isClusterLoading && !clusterDetails);

  if (isLoading) {
    return (
      <EuiPage restrictWidth={1200}>
        <EuiPageBody>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '50vh' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }

  // Extend the context with the fetched config value
  const extendedContext: CloudConnectedAppContextValue = {
    ...appContext,
    clusterConfig: config!,
    hasConfigurePermission: appContext.application.capabilities.cloudConnect?.configure === true,
    justConnected: appContext.justConnected,
    setJustConnected: appContext.setJustConnected,
    autoEnablingEis: appContext.autoEnablingEis,
    setAutoEnablingEis: appContext.setAutoEnablingEis,
  };

  return (
    <CloudConnectedAppContextProvider value={extendedContext}>
      <EuiPage>
        <EuiPageBody panelled={true}>
          {clusterDetails ? (
            <ConnectedServicesPage
              clusterDetails={clusterDetails}
              onServiceUpdate={handleServiceUpdate}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <OnboardingPage onConnect={handleConnect} />
          )}
        </EuiPageBody>
      </EuiPage>
    </CloudConnectedAppContextProvider>
  );
};
