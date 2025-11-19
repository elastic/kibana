/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useCloudConnectedAppContext } from './app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage } from './components/connected_services';
import type { ClusterDetails } from '../types';

export const CloudConnectedAppMain: React.FC = () => {
  const { http, notifications } = useCloudConnectedAppContext();
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useBreadcrumbs();

  const fetchClusterDetails = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
    // After successful connection, refetch cluster details
    fetchClusterDetails();
  };

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
    <EuiPage>
      <EuiPageBody panelled={true}>
        {clusterDetails ? (
          <ConnectedServicesPage clusterDetails={clusterDetails} onRefetch={handleRefetch} />
        ) : (
          <OnboardingPage onConnect={handleConnect} />
        )}
      </EuiPageBody>
    </EuiPage>
  );
};
