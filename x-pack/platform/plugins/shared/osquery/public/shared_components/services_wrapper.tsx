/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '../common/lib/kibana';

import { queryClient } from '../query_client';
import { KibanaRenderContextProvider } from '../shared_imports';
import type { StartPlugins } from '../types';

export interface ServicesWrapperProps {
  services: CoreStart & StartPlugins;
  children: React.ReactNode;
}

const ServicesWrapperComponent: React.FC<ServicesWrapperProps> = ({ services, children }) => (
  <KibanaRenderContextProvider {...services}>
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  </KibanaRenderContextProvider>
);

const ServicesWrapper = React.memo(ServicesWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { ServicesWrapper as default };
