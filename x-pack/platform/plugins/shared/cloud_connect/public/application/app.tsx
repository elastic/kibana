/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useCloudConnectedAppContext, CloudConnectedAppContextProvider } from './app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { useCloudConnectConfig } from './hooks/use_cloud_connect_config';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage } from './components/connected_services';
import type { ClusterDetails } from '../types';

export const CloudConnectedAppMain: React.FC = () => {
  const appContext = useCloudConnectedAppContext();
  const { http, notifications } = appContext;
  const { hasEncryptedSOEnabled, isLoading: isConfigLoading } = useCloudConnectConfig();
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [isClusterLoading, setIsClusterLoading] = useState(true);

  useBreadcrumbs();

  const fetchClusterDetails = async () => {
    setIsClusterLoading(true);
    try {
      const data = await http.get<ClusterDetails>('/internal/cloud_connect/cluster_details');
      setClusterDetails(data);
    } catch (error) {
      // Only show toast for non-503 errors
      if (error?.body?.statusCode !== 503) {
        notifications.toasts.addError(error.body as Error, {
          title: 'Failed to load cluster details',
        });
      }
      // On any error, show onboarding (clusterDetails remains null)
      setClusterDetails(null);
    } finally {
      setIsClusterLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    hasEncryptedSOEnabled,
  };

  const handleRefetch = async () => {
    try {
      const data = await http.get<ClusterDetails>('/internal/cloud_connect/cluster_details');
      setClusterDetails(data);
    } catch (error) {
      // Only show toast for non-503 errors
      if (error?.body?.statusCode !== 503) {
        notifications.toasts.addError(error as Error, {
          title: 'Failed to load cluster details',
        });
      }
      // On any error, show onboarding (clusterDetails remains null)
      setClusterDetails(null);
    }
  };

  return (
    <CloudConnectedAppContextProvider value={extendedContext}>
      <EuiPage>
        <EuiPageBody panelled={true}>
          {clusterDetails ? (
            <ConnectedServicesPage clusterDetails={clusterDetails} onRefetch={handleRefetch} />
          ) : (
            <OnboardingPage onConnect={fetchClusterDetails} />
          )}
        </EuiPageBody>
      </EuiPage>
    </CloudConnectedAppContextProvider>
  );
};
