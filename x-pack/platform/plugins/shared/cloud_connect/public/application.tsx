/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CloudConnectedAppContextProvider } from './application/app_context';
import { useCloudConnectedAppContext } from './application/app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage } from './components/connected_services';

interface CloudConnectedAppComponentProps {
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  notifications: CoreStart['notifications'];
  history: AppMountParameters['history'];
}

interface ClusterDetails {
  id: string;
  name: string;
  metadata: {
    created_at: string;
    created_by: string;
    organization_id: string;
  };
  self_managed_cluster: {
    id: string;
    name: string;
    version: string;
  };
  license: {
    type: string;
    uid: string;
  };
  services: {
    auto_ops?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
    eis?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
  };
}

const CloudConnectedAppMain: React.FC = () => {
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

  return (
    <EuiPage>
      <EuiPageBody panelled={true}>
        {clusterDetails ? (
          <ConnectedServicesPage clusterDetails={clusterDetails} />
        ) : (
          <OnboardingPage onConnect={handleConnect} />
        )}
      </EuiPageBody>
    </EuiPage>
  );
};

const CloudConnectedAppComponent: React.FC<CloudConnectedAppComponentProps> = ({
  chrome,
  application,
  http,
  docLinks,
  notifications,
  history,
}) => {
  return (
    <CloudConnectedAppContextProvider
      value={{ chrome, application, http, docLinks, notifications, history }}
    >
      <CloudConnectedAppMain />
    </CloudConnectedAppContextProvider>
  );
};

export const CloudConnectedApp = (core: CoreStart, params: AppMountParameters) => {
  ReactDOM.render(
    core.rendering.addContext(
      <CloudConnectedAppComponent
        chrome={core.chrome}
        application={core.application}
        http={core.http}
        docLinks={core.docLinks}
        notifications={core.notifications}
        history={params.history}
      />
    ),
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
