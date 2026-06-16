/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createTestQueryClient, createMockServices } from '../../../../test_utils';
import { RuleFormProvider } from '../../../../form/contexts';
import { BuilderStateProvider } from '../builder_state_context';
import { RuleBuilderAlertConditionStep } from './alert_condition_step';
import type { ThresholdFormValues } from './form_types';
import { DEFAULT_THRESHOLD_FORM_VALUES } from './form_types';
import type { ComposeFormValues } from '../../compose_form_types';
import type { ComposeDiscoverState } from '../../types';
import { createInitialState } from '../../use_compose_discover_state';

jest.mock('../../../../form/hooks/use_data_fields', () => ({
  useDataFields: jest.fn(() => ({ data: {} })),
}));

jest.mock('../../../../form/hooks/use_index_sources', () => ({
  useIndexSources: jest.fn(() => ({ data: [], isLoading: false })),
}));

const makeBuilderState = (overrides: Partial<ThresholdFormValues> = {}): ThresholdFormValues => ({
  ...DEFAULT_THRESHOLD_FORM_VALUES,
  indexPattern: 'logs-*',
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: 'Test rule', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'composed', base: 'FROM logs-*', blocks: { breach: '| WHERE count > 100' } },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
};

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  queryCommitted: true,
  ...overrides,
});

const renderStep = ({
  builderState = makeBuilderState(),
  stateOverrides = {},
  formValueOverrides = {},
}: {
  builderState?: ThresholdFormValues;
  stateOverrides?: Partial<ComposeDiscoverState>;
  formValueOverrides?: Partial<ComposeFormValues>;
} = {}) => {
  const state = createState(stateOverrides);
  const dispatch = jest.fn();
  const services = createMockServices();
  const setBuilderState = jest.fn();
  const queryClient = createTestQueryClient();
  const defaultValues: ComposeFormValues = { ...BASE_COMPOSE_VALUES, ...formValueOverrides };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const form = useForm<ComposeFormValues>({ defaultValues });
    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
              <BuilderStateProvider
                builderState={builderState}
                setBuilderState={setBuilderState as (s: unknown) => void}
              >
                {children}
              </BuilderStateProvider>
            </RuleFormProvider>
          </FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  render(<RuleBuilderAlertConditionStep state={state} dispatch={dispatch} services={services} />, {
    wrapper: Wrapper,
  });

  return { dispatch, services, setBuilderState };
};

describe('RuleBuilderAlertConditionStep - alert delay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AlertDelayField when kind is alert', () => {
    renderStep({ formValueOverrides: { kind: 'alert' } });

    expect(screen.getByTestId('alertDelayFormRow')).toBeTruthy();
  });

  it('does not render AlertDelayField when kind is signal', () => {
    renderStep({
      formValueOverrides: {
        kind: 'signal',
        query: { format: 'standalone', breach: 'FROM logs-* | WHERE count > 100' },
      },
    });

    expect(screen.queryByTestId('alertDelayFormRow')).toBeNull();
  });

  it('defaults to Immediate mode', () => {
    renderStep({ formValueOverrides: { stateTransitionAlertDelayMode: 'immediate' } });

    const alertRow = screen.getByTestId('alertDelayFormRow');
    expect(within(alertRow).getByTestId('stateTransitionImmediateDescription')).toBeTruthy();
  });

  it('switches between Immediate, Breaches, and Duration modes', () => {
    renderStep({ formValueOverrides: { stateTransitionAlertDelayMode: 'immediate' } });

    const alertRow = screen.getByTestId('alertDelayFormRow');

    fireEvent.click(within(alertRow).getByText('Breaches'));
    expect(screen.getByTestId('stateTransitionCountInput')).toBeTruthy();

    fireEvent.click(within(alertRow).getByText('Duration'));
    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeTruthy();

    fireEvent.click(within(alertRow).getByText('Immediate'));
    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeTruthy();
  });
});
