/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Services } from '../../services/types';
import type { IntegrationManagementComponent } from './types';

const IntegrationManagementLazy = React.lazy(() =>
  import('./integration_management').then((module) => ({
    default: module.IntegrationManagement,
  }))
);

export const getIntegrationManagementLazy = (services: Services): IntegrationManagementComponent =>
  React.memo(function IntegrationManagement() {
    return (
      <KibanaContextProvider services={services}>
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>
          <IntegrationManagementLazy />
        </Suspense>
      </KibanaContextProvider>
    );
  });
