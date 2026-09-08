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
import { LocatorProvider, type AlertingV2Locators } from '../application/locator_context';

const createMockLocator = () => ({
  useUrl: jest.fn().mockReturnValue('/mock-locator-url'),
  getUrl: jest.fn().mockResolvedValue('/mock-locator-url'),
  getRedirectUrl: jest.fn().mockReturnValue('/mock-locator-url'),
  navigate: jest.fn().mockResolvedValue(undefined),
  navigateSync: jest.fn(),
  getLocation: jest.fn().mockResolvedValue({ app: 'management', path: '/', state: {} }),
  getTimeRange: jest.fn(),
  setTimeRange: jest.fn().mockImplementation((p: unknown) => p),
});

export const createMockLocators = (): AlertingV2Locators => ({
  rulesLocators: createMockLocator() as unknown as AlertingV2Locators['rulesLocators'],
  ruleLibraryLocators: createMockLocator() as unknown as AlertingV2Locators['ruleLibraryLocators'],
  episodesLocators: createMockLocator() as unknown as AlertingV2Locators['episodesLocators'],
  actionPolicyLocators:
    createMockLocator() as unknown as AlertingV2Locators['actionPolicyLocators'],
  executionHistoryLocators:
    createMockLocator() as unknown as AlertingV2Locators['executionHistoryLocators'],
});

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
  locators?: AlertingV2Locators;
}>;

export function TestProviders({
  children,
  services = createDefaultServicesMock(),
  queryClient = createTestQueryClient(),
  locators = createMockLocators(),
}: TestProvidersProps) {
  return (
    <LocatorProvider locators={locators}>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>{children}</I18nProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    </LocatorProvider>
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
  initialEntries,
  locators = createMockLocators(),
}: PropsWithChildren<{
  queryClient?: QueryClient;
  initialEntries?: string[];
  locators?: AlertingV2Locators;
}>) {
  return (
    <LocatorProvider locators={locators}>
      <MockChromeContextProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </MemoryRouter>
        </I18nProvider>
      </MockChromeContextProvider>
    </LocatorProvider>
  );
}
