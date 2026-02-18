/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { mockServices } from './services';
import { UIStateProvider } from '../components/integration_management/contexts';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

export interface TestProviderProps {
  initialEntries?: string[];
}

export const TestProvider: React.FC<PropsWithChildren<TestProviderProps>> = ({
  children,
  initialEntries = ['/'],
}) => {
  const queryClient = createTestQueryClient();

  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={initialEntries}>
            <UIStateProvider>{children}</UIStateProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

export const SimpleTestProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
