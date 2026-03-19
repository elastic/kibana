/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleListServices, RuleListPaths } from './rule_list_context';
import { RuleListProvider } from './rule_list_context';

export const createMockServices = (
  overrides: Partial<RuleListServices> = {}
): RuleListServices => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    basePath: { prepend: jest.fn((path: string) => path) },
    ...overrides.http,
  } as unknown as RuleListServices['http'],
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
      addError: jest.fn(),
    },
    ...overrides.notifications,
  } as unknown as RuleListServices['notifications'],
  application: {
    navigateToUrl: jest.fn(),
    capabilities: {},
    ...overrides.application,
  } as unknown as RuleListServices['application'],
});

export const createMockPaths = (overrides: Partial<RuleListPaths> = {}): RuleListPaths => ({
  ruleDetails: overrides.ruleDetails ?? ((id: string) => `/rules/${id}`),
  ruleEdit: overrides.ruleEdit ?? ((id: string) => `/rules/edit/${id}`),
  ruleCreate: overrides.ruleCreate ?? '/rules/create',
});

export const createTestWrapper = (
  services: RuleListServices = createMockServices(),
  paths: RuleListPaths = createMockPaths()
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <RuleListProvider services={services} paths={paths}>
          {children}
        </RuleListProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};
