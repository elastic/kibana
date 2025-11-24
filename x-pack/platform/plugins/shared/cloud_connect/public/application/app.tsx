/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useCloudConnectedAppContext, CloudConnectedAppContextProvider } from './app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage } from './components/connected_services';
import { apiService } from '../lib/api';

export const CloudConnectedAppMain: React.FC = () => {
  const appContext = useCloudConnectedAppContext();
  const { notifications } = appContext;

  const { data: config, isLoading: isConfigLoading } = apiService.useLoadConfig();
  const {
    data: clusterDetails,
    isLoading: isClusterLoading,
    error: clusterError,
    resendRequest: refetchClusterDetails,
  } = apiService.useLoadClusterDetails();

  useBreadcrumbs();

  // Show error toast for non-503 errors
  if (clusterError && clusterError.statusCode !== 503) {
    notifications.toasts.addError(clusterError as Error, {
      title: 'Failed to load cluster details',
    });
  }

  const isLoading = isConfigLoading || isClusterLoading;

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
  const extendedContext = {
    ...appContext,
    hasEncryptedSOEnabled: config?.hasEncryptedSOEnabled,
  };

  return (
    <CloudConnectedAppContextProvider value={extendedContext}>
      <EuiPage>
        <EuiPageBody panelled={true}>
          {clusterDetails ? (
            <ConnectedServicesPage clusterDetails={clusterDetails} onRefetch={refetchClusterDetails} />
          ) : (
            <OnboardingPage onConnect={refetchClusterDetails} />
          )}
        </EuiPageBody>
      </EuiPage>
    </CloudConnectedAppContextProvider>
  );
};
