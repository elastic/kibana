/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
import React, { type FC, type PropsWithChildren } from 'react';
import { createTestQueryClient } from './create_query_client_wrapper';

export interface TestProviderProps {
  queryClient?: QueryClient;
}

export const TestProvider: FC<PropsWithChildren<TestProviderProps>> = ({
  children,
  queryClient,
}) => {
  const client = queryClient ?? createTestQueryClient();

  return (
    <EuiProvider colorMode="light">
      <I18nProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nProvider>
    </EuiProvider>
  );
};

export const getTestProvider = ({ queryClient }: TestProviderProps = {}): FC<PropsWithChildren> =>
  function WithTestProviders({ children }) {
    return <TestProvider queryClient={queryClient}>{children}</TestProvider>;
  };
