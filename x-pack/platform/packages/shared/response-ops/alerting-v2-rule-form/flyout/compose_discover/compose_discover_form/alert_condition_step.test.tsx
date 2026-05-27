/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createTestQueryClient, createMockServices } from '../../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { ComposeFormValues } from '../compose_form_types';
import { AlertConditionStep } from './alert_condition_step';

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: ({ value }: { value: string }) => <pre data-test-subj="codeEditorMock">{value}</pre>,
}));

jest.mock('@kbn/esql-utils', () => ({
  getEsqlColumns: jest.fn(async () => []),
}));

jest.mock('../../../form/hooks/use_data_fields', () => ({
  useDataFields: jest.fn(() => ({ data: {} })),
}));

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

const createComposeFormWrapper = (
  formValueOverrides: Partial<ComposeFormValues> = {},
  services: RuleFormServices = createMockServices()
) => {
  const queryClient = createTestQueryClient();
  const defaultValues: ComposeFormValues = {
    ...BASE_COMPOSE_VALUES,
    ...formValueOverrides,
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm<ComposeFormValues>({ defaultValues });
    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
              {children}
            </RuleFormProvider>
          </FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  return Wrapper;
};

const renderAlertStep = (
  stateOverrides: Partial<ComposeDiscoverState> = {},
  formValueOverrides: Partial<ComposeFormValues> = {}
) => {
  const state = createState({
    queryCommitted: true,
    ...stateOverrides,
  });
  const dispatch = jest.fn();
  const onKindChange = jest.fn();
  const services = createMockServices();

  render(
    <AlertConditionStep
      state={state}
      dispatch={dispatch}
      services={services}
      onKindChange={onKindChange}
    />,
    { wrapper: createComposeFormWrapper(formValueOverrides, services) }
  );

  return { dispatch, state, onKindChange };
};

describe('AlertConditionStep', () => {
  describe('group-by auto-population in tracking mode', () => {
    it('extracts BY columns from the base query (composed format)', async () => {
      renderAlertStep(
        { queryCommitted: true },
        {
          query: {
            format: 'composed',
            base: 'FROM logs-*\n| STATS count = COUNT(*) BY host.name',
            blocks: { breach: '| WHERE count > 100' },
          },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('host.name')).toBeInTheDocument();
      });
    });

    it('extracts multiple BY columns from the base query', async () => {
      renderAlertStep(
        { queryCommitted: true },
        {
          query: {
            format: 'composed',
            base: 'FROM kibana_sample_data_ecommerce\n| STATS total = SUM(taxful_total_price) BY customer_gender, day_of_week',
            blocks: { breach: '| WHERE total > 1000' },
          },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('customer_gender')).toBeInTheDocument();
        expect(screen.getByText('day_of_week')).toBeInTheDocument();
      });
    });

    it('clears group fields when the base query has no STATS BY', async () => {
      renderAlertStep(
        { queryCommitted: true },
        {
          query: {
            format: 'composed',
            base: 'FROM logs-*\n| STATS count = COUNT(*)',
            blocks: { breach: '| WHERE count > 100' },
          },
        }
      );

      const comboBox = screen.getByTestId('composeDiscoverGroupFields');
      await waitFor(() => {
        expect(comboBox).toBeInTheDocument();
      });
      expect(comboBox.querySelectorAll('[data-test-subj="euiComboBoxPill"]')).toHaveLength(0);
    });
  });
});
