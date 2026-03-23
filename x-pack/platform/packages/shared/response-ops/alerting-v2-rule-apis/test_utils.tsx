/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

export interface MockServices {
  http: jest.Mocked<HttpStart>;
  notifications: {
    toasts: jest.Mocked<
      Pick<NotificationsStart['toasts'], 'addSuccess' | 'addDanger' | 'addWarning' | 'addError'>
    >;
  };
}

export const createMockServices = (): MockServices => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    basePath: { prepend: jest.fn((path: string) => path) },
  } as unknown as jest.Mocked<HttpStart>,
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
      addError: jest.fn(),
    },
  } as MockServices['notifications'],
});

export const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
