/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

let getFormValues: (() => ComposeFormValues) | undefined;

const CaptureFormGetValues = () => {
  getFormValues = useFormContext<ComposeFormValues>().getValues;
  return null;
};

const BASE_QUERY = 'FROM logs-*';
const ALERT_BLOCK = '| WHERE count > 100';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: {
    format: 'composed',
    base: BASE_QUERY,
    blocks: { breach: ALERT_BLOCK },
  },
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
  getFormValues = undefined;
  const state = createState({
    queryCommitted: true,
    ...stateOverrides,
  });
  const dispatch = jest.fn();
  const onKindChange = jest.fn();
  const services = createMockServices();

  render(
    <>
      <CaptureFormGetValues />
      <AlertConditionStep
        state={state}
        dispatch={dispatch}
        services={services}
        onKindChange={onKindChange}
      />
    </>,
    { wrapper: createComposeFormWrapper(formValueOverrides, services) }
  );

  return { dispatch, state, onKindChange };
};

describe('AlertConditionStep', () => {
  it('renders AlertDelayField when tracking is enabled', () => {
    renderAlertStep({}, { kind: 'alert' });

    expect(screen.getByTestId('alertDelayFormRow')).toBeTruthy();
  });

  it('does not render AlertDelayField when tracking is disabled', () => {
    renderAlertStep(
      {},
      {
        kind: 'signal',
        query: { format: 'standalone', breach: `${BASE_QUERY}\n${ALERT_BLOCK}` },
      }
    );

    expect(screen.queryByTestId('alertDelayFormRow')).toBeNull();
  });

  it('defaults to Immediate mode', () => {
    renderAlertStep({}, { kind: 'alert', stateTransitionAlertDelayMode: 'immediate' });

    expect(screen.getByTestId('stateTransitionImmediateDescription').textContent).toContain(
      'No delay - Alerts on first breach'
    );
  });

  it('renders Breaches controls when alert delay mode is breaches', () => {
    renderAlertStep(
      {},
      {
        stateTransitionAlertDelayMode: 'breaches',
        stateTransition: { pendingCount: 5 },
      }
    );

    expect(screen.getByTestId('stateTransitionCountInput')).toBeTruthy();
  });

  it('renders Duration controls when alert delay mode is duration', () => {
    renderAlertStep(
      {},
      {
        stateTransitionAlertDelayMode: 'duration',
        stateTransition: { pendingTimeframe: '10m' },
      }
    );

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeTruthy();
  });

  it('switches between Immediate, Breaches, Duration, and back to Immediate', () => {
    renderAlertStep({}, { stateTransitionAlertDelayMode: 'immediate' });

    const alertRow = screen.getByTestId('alertDelayFormRow');
    fireEvent.click(within(alertRow).getByText('Breaches'));
    expect(screen.getByTestId('stateTransitionCountInput')).toBeTruthy();

    fireEvent.click(within(alertRow).getByText('Duration'));
    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeTruthy();

    fireEvent.click(within(alertRow).getByText('Immediate'));
    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeTruthy();
    expect(screen.queryByTestId('stateTransitionCountInput')).toBeNull();
    expect(screen.queryByTestId('stateTransitionTimeframeNumberInput')).toBeNull();
  });

  it('clears pending fields without affecting recovery fields when switching to Immediate', () => {
    renderAlertStep(
      {},
      {
        stateTransitionAlertDelayMode: 'breaches',
        stateTransitionRecoveryDelayMode: 'recoveries',
        stateTransition: {
          pendingCount: 2,
          pendingTimeframe: null,
          recoveringCount: 3,
          recoveringTimeframe: null,
        },
      }
    );

    fireEvent.click(within(screen.getByTestId('alertDelayFormRow')).getByText('Immediate'));

    const values = getFormValues!();
    expect(values.stateTransition?.pendingCount).toBeNull();
    expect(values.stateTransition?.pendingTimeframe).toBeNull();
    expect(values.stateTransition?.recoveringCount).toBe(3);
  });

  it('uses default count when switching from immediate with pendingCount: 0 to breaches', () => {
    renderAlertStep(
      {},
      {
        stateTransitionAlertDelayMode: 'immediate',
        stateTransition: { pendingCount: 0 },
      }
    );

    fireEvent.click(within(screen.getByTestId('alertDelayFormRow')).getByText('Breaches'));

    const values = getFormValues!();
    expect(values.stateTransitionAlertDelayMode).toBe('breaches');
    expect(values.stateTransition?.pendingCount).toBe(2);
  });

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
