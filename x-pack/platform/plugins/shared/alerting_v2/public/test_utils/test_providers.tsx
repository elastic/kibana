/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from 'react-router-dom';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { AlertEpisodesKibanaServices } from '../episodes_kibana_services';

export const createDefaultServicesMock = (): AlertEpisodesKibanaServices => {
  return {
    ...coreMock.createStart(),
    data: dataPluginMock.createStartContract(),
    share: sharePluginMock.createStartContract(),
    expressions: {} as unknown,
    rendering: {} as unknown,
  } as unknown as AlertEpisodesKibanaServices;
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

export type TestProvidersProps = PropsWithChildren<{
  services?: AlertEpisodesKibanaServices;
  queryClient?: QueryClient;
}>;

export function TestProviders({
  children,
  services = createDefaultServicesMock(),
  queryClient = createTestQueryClient(),
}: TestProvidersProps) {
  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
}

/**
 * Provider stack shared by the management list-page tests (rules, action policies, alert episodes,
 * execution history). These pages inject services via mocked `useService` / `useKibana`, so this
 * wrapper deliberately omits `KibanaContextProvider` and only supplies the ambient contexts the
 * pages need: chrome (for `@kbn/app-header`), i18n, routing, and react-query.
 */
export function ListPageTestProviders({
  children,
  queryClient = createTestQueryClient(),
}: PropsWithChildren<{ queryClient?: QueryClient }>) {
  return (
    <MockChromeContextProvider>
      <I18nProvider>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MemoryRouter>
      </I18nProvider>
    </MockChromeContextProvider>
  );
}
