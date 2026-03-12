/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useLocation } from 'react-router-dom';
import type { Services } from '../../services/types';
import { IntegrationManagement } from '../integration_management/integration_management';
import { UIStateProvider } from '../integration_management/contexts';
import { CreateIntegrationUpload } from './create_integration_upload';
import { ManageIntegrations } from './manage_integrations';

const queryClient = new QueryClient();

interface CreateIntegrationProps {
  services: Services;
}
const CreateIntegrationContents = React.memo(() => {
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  if (pathname.endsWith('/upload')) {
    return <CreateIntegrationUpload />;
  }
  if (params.get('view') === 'manage') {
    return <ManageIntegrations />;
  }
  return <IntegrationManagement />;
});
CreateIntegrationContents.displayName = 'CreateIntegrationContents';

export const CreateIntegration = React.memo<CreateIntegrationProps>(({ services }) => (
  <QueryClientProvider client={queryClient}>
    <KibanaContextProvider services={services}>
      <UIStateProvider>
        <CreateIntegrationContents />
      </UIStateProvider>
    </KibanaContextProvider>
  </QueryClientProvider>
));
CreateIntegration.displayName = 'CreateIntegration';
