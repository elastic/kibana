/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { ScheduleField } from './schedule_field';
import {
  createFormWrapper,
  createMockServices,
  createTestQueryClient,
  defaultTestFormValues,
} from '../../test_utils';
import type { FormValues } from '../types';
import { RuleFormProvider } from '../contexts';

describe('ScheduleField', () => {
  it('renders the schedule label', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders help text', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Set the frequency to check the alert conditions')).toBeInTheDocument();
  });

  it('renders tooltip icon', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    // The EuiIconTip renders a span with "Info" text
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders correctly in flyout layout', () => {
    render(<ScheduleField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('displays initial schedule value', () => {
    render(<ScheduleField />, {
      wrapper: createFormWrapper({
        schedule: { every: '5m', lookback: '1m' },
      }),
    });

    // The RuleSchedule component should render with the value
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('does not offer "seconds" as a schedule unit', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    const select = screen.getByTestId('ruleScheduleUnitInput') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['m', 'h', 'd']);
  });

  it('rejects a schedule interval shorter than the minimum on submit', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          schedule: { every: '15s', lookback: '1m' },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
            <button type="button" onClick={form.handleSubmit(() => {})}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<ScheduleField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Schedule cannot be less than 1m.')).toBeInTheDocument();
    });
  });

  it('accepts a schedule interval at the minimum on submit', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();
    const onSubmit = jest.fn();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          schedule: { every: '1m', lookback: '1m' },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
            <button type="button" onClick={form.handleSubmit(onSubmit)}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<ScheduleField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Schedule cannot be less than/)).not.toBeInTheDocument();
  });

  it('validates against the configured minimumScheduleInterval instead of the default', async () => {
    const queryClient = createTestQueryClient();
    const services = { ...createMockServices(), minimumScheduleInterval: '5m' };

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          schedule: { every: '1m', lookback: '1m' },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
            <button type="button" onClick={form.handleSubmit(() => {})}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<ScheduleField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Schedule cannot be less than 5m.')).toBeInTheDocument();
    });
  });
});
