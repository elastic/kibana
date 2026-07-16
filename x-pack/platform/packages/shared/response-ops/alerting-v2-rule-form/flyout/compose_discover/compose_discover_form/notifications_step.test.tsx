/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { INLINE_WORKFLOW_TAG } from '../../../actions_form';
import type { FormValues } from '../../../form/types';
import { NotificationsStep } from './notifications_step';

const createWrapper = (formRef?: { current: UseFormReturn<FormValues> | null }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<FormValues>({
      defaultValues: {} as FormValues,
      mode: 'onBlur',
    });
    if (formRef) {
      formRef.current = form;
    }
    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>{children}</FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };
};

const mockInlinePolicyResponses = (
  http: ReturnType<typeof httpServiceMock.createStartContract>
) => {
  http.fetch.mockResolvedValue({
    items: [
      {
        actionPolicy: {
          id: 'policy-1',
          version: 'v1',
          matcher: 'rule.id: "rule-1"',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        },
        category: 'global-filtered',
      },
    ],
  } as any);
  http.get.mockResolvedValue({
    id: 'wf-1',
    definition: {
      tags: [INLINE_WORKFLOW_TAG],
      steps: [
        {
          type: 'email',
          'connector-id': 'c1',
          with: { to: 'a@b.com', subject: 's', message: 'm' },
        },
      ],
    },
  } as any);
};

describe('NotificationsStep', () => {
  it('gates the form on the drafts fetch in edit mode, hiding the picker while loading', async () => {
    const http = httpServiceMock.createStartContract();
    // Keep the match request pending so the drafts stay in-flight.
    let resolveFetch: (value: unknown) => void = () => {};
    http.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }) as any
    );

    render(<NotificationsStep http={http} ruleId="rule-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('notificationsStepLoading')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('actionForm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('actionTemplateCard-inline-email')).not.toBeInTheDocument();

    resolveFetch({ items: [] });

    await waitFor(() => {
      expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('notificationsStepLoading')).not.toBeInTheDocument();
  });

  it('populates existing simple actions as editable rows in edit mode', async () => {
    const http = httpServiceMock.createStartContract();
    mockInlinePolicyResponses(http);

    render(<NotificationsStep http={http} ruleId="rule-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('actionRow-policy-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('actionRowToggle-policy-1')).toBeInTheDocument();
    expect(screen.getByTestId('actionRowRemove-policy-1')).toBeInTheDocument();
    expect(screen.getByTestId('actionFormAddAnother')).toBeInTheDocument();
  });

  it('shows the template-card picker in edit mode when the rule has no existing simple actions', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValue({ items: [] } as any);

    render(<NotificationsStep http={http} ruleId="rule-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('actionRow-policy-1')).not.toBeInTheDocument();
    expect(http.fetch).toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('shows the template-card picker and does not fetch in create mode', async () => {
    const http = httpServiceMock.createStartContract();
    mockInlinePolicyResponses(http);

    render(<NotificationsStep http={http} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('actionForm')).toBeInTheDocument();
    });

    expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
    expect(screen.queryByTestId('actionRow-policy-1')).not.toBeInTheDocument();
    expect(http.fetch).not.toHaveBeenCalled();
  });

  describe('notifications field validation', () => {
    it('still validates while drafts are loading (Controller stays mounted)', async () => {
      const http = httpServiceMock.createStartContract();
      http.fetch.mockReturnValue(new Promise(() => {}) as any);
      const formRef: { current: UseFormReturn<FormValues> | null } = { current: null };

      render(<NotificationsStep http={http} ruleId="rule-1" />, {
        wrapper: createWrapper(formRef),
      });

      await waitFor(() => {
        expect(screen.getByTestId('notificationsStepLoading')).toBeInTheDocument();
      });

      await act(async () => {
        formRef.current!.setValue('notifications', {
          workflows: [{ id: 'item-1', source: 'existing', workflowId: null }],
        });
      });

      let valid = true;
      await act(async () => {
        valid = await formRef.current!.trigger('notifications');
      });

      expect(valid).toBe(false);
    });

    it('passes trigger when notifications are empty', async () => {
      const http = httpServiceMock.createStartContract();
      const formRef: { current: UseFormReturn<FormValues> | null } = { current: null };
      render(<NotificationsStep http={http} />, { wrapper: createWrapper(formRef) });

      await waitFor(() => {
        expect(screen.getByTestId('composeDiscoverNotificationsField')).toBeInTheDocument();
      });

      let valid = false;
      await act(async () => {
        valid = await formRef.current!.trigger('notifications');
      });
      expect(valid).toBe(true);
    });

    it('fails trigger and shows an error for an incomplete existing action', async () => {
      const http = httpServiceMock.createStartContract();
      const formRef: { current: UseFormReturn<FormValues> | null } = { current: null };
      render(<NotificationsStep http={http} />, { wrapper: createWrapper(formRef) });

      await waitFor(() => {
        expect(screen.getByTestId('composeDiscoverNotificationsField')).toBeInTheDocument();
      });

      await act(async () => {
        formRef.current!.setValue('notifications', {
          workflows: [{ id: 'item-1', source: 'existing', workflowId: null }],
        });
      });

      let valid = true;
      await act(async () => {
        valid = await formRef.current!.trigger('notifications');
      });

      expect(valid).toBe(false);
      await waitFor(() => {
        expect(screen.getByText(/incomplete actions/i)).toBeInTheDocument();
      });
    });
  });
});
