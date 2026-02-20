/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FormValues } from './form/types';

/**
 * Creates a QueryClient configured for testing (no retries, silent logger).
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

/**
 * Creates a wrapper component with QueryClientProvider for testing hooks.
 * Use this for hook tests that only need React Query context.
 */
export const createQueryClientWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Default form values for testing.
 */
export const defaultTestFormValues: FormValues = {
  kind: 'alert',
  metadata: {
    name: '',
    enabled: true,
  },
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  evaluation: {
    query: {
      base: '',
    },
  },
};

/**
 * Creates a wrapper component with QueryClientProvider and FormProvider for testing components.
 * Use this for component tests that need both React Query and react-hook-form context.
 */
export const createFormWrapper = (defaultValues: Partial<FormValues> = {}) => {
  const queryClient = createTestQueryClient();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const form = useForm<FormValues>({
      defaultValues: {
        ...defaultTestFormValues,
        ...defaultValues,
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryClientProvider>
    );
  };

  return Wrapper;
};
