/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { FormValues } from '../../../form/types';
import { NotificationsStep } from './notifications_step';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<FormValues>({ defaultValues: {} as FormValues });
    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>{children}</FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };
};

describe('NotificationsStep', () => {
  it('shows the template-card picker in edit mode', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValue({ items: [] } as any);

    render(<NotificationsStep />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('actionRow-policy-1')).not.toBeInTheDocument();
  });
});
