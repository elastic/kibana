/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createTestQueryClient, createMockServices } from '../../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { ComposeFormValues, RuleQuery } from '../compose_form_types';
import { RecoveryConditionStep } from './recovery_condition_step';

const BASE_QUERY = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_SEGMENT = 'WHERE count > 100';
const RECOVERY_SEGMENT = 'WHERE count < 100';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'composed', base: '', breach: { segment: '' } },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

const createComposeFormWrapper = (
  queryOverride?: RuleQuery,
  services: RuleFormServices = createMockServices()
) => {
  const queryClient = createTestQueryClient();
  const defaultValues: ComposeFormValues = {
    ...BASE_COMPOSE_VALUES,
    ...(queryOverride ? { query: queryOverride } : {}),
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

const CUSTOM_RECOVERY_QUERY: RuleQuery = {
  format: 'composed',
  base: BASE_QUERY,
  breach: { segment: ALERT_SEGMENT },
  recovery: { segment: RECOVERY_SEGMENT },
};

const CUSTOM_NO_RECOVERY_QUERY: RuleQuery = {
  format: 'composed',
  base: BASE_QUERY,
  breach: { segment: ALERT_SEGMENT },
};

const renderRecoveryStep = (
  stateOverrides: Partial<ComposeDiscoverState> = {},
  queryOverride?: RuleQuery
) => {
  const state = createState({
    queryCommitted: true,
    ...stateOverrides,
  });
  const dispatch = jest.fn();
  const onRecoveryTypeChange = jest.fn();
  const services = createMockServices();

  render(
    <RecoveryConditionStep
      state={state}
      dispatch={dispatch}
      onRecoveryTypeChange={onRecoveryTypeChange}
    />,
    { wrapper: createComposeFormWrapper(queryOverride, services) }
  );

  return { dispatch, state, onRecoveryTypeChange };
};

describe('RecoveryConditionStep', () => {
  it('renders the recovery type selector in default mode', () => {
    renderRecoveryStep({ recoveryType: 'default' });

    expect(screen.getByTestId('composeDiscoverRecoveryType')).toBeInTheDocument();
  });

  it('does not render query summaries or edit button in default mode', () => {
    renderRecoveryStep({ recoveryType: 'default' });

    expect(screen.queryByTestId('composeDiscoverEsqlQuerySection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEditRecovery')).not.toBeInTheDocument();
  });

  it('renders the ES|QL summary section with code blocks and edit button in custom mode', () => {
    renderRecoveryStep({ recoveryType: 'custom' }, CUSTOM_RECOVERY_QUERY);

    expect(screen.getByTestId('composeDiscoverEsqlQuerySection')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEsqlQuerySectionTitle')).toHaveTextContent(
      'Recovery condition'
    );
    expect(screen.getByText('Custom recovery condition defined')).toBeInTheDocument();
    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(screen.getByText('Recovery condition', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toHaveTextContent('FROM logs-*');
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toHaveTextContent(
      'STATS count = COUNT(*) BY host.name'
    );
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-recovery')).toHaveTextContent(
      RECOVERY_SEGMENT
    );
    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeInTheDocument();
  });

  it('derives the base query display from standalone committed queries', () => {
    renderRecoveryStep(
      { recoveryType: 'custom' },
      {
        format: 'standalone',
        breach: {
          query: `${BASE_QUERY}\n| ${ALERT_SEGMENT}`,
        },
      }
    );

    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toHaveTextContent('FROM logs-*');
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toHaveTextContent(
      'STATS count = COUNT(*) BY host.name'
    );
  });

  it('shows start description when recovery block is empty', () => {
    renderRecoveryStep({ recoveryType: 'custom' }, CUSTOM_NO_RECOVERY_QUERY);

    expect(screen.getByText('Open the editor to define your recovery condition')).toBeInTheDocument();
    expect(screen.getByText('Not defined')).toBeInTheDocument();
  });

  it('disables the edit button when the child flyout is open', () => {
    renderRecoveryStep({ recoveryType: 'custom', childOpen: true }, CUSTOM_RECOVERY_QUERY);

    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeDisabled();
  });

  it('dispatches OPEN_CHILD_FOR_STEP on edit button click', () => {
    const { dispatch, state } = renderRecoveryStep(
      { recoveryType: 'custom', childOpen: false, step: 1 },
      CUSTOM_RECOVERY_QUERY
    );

    fireEvent.click(screen.getByTestId('composeDiscoverEditRecovery'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_CHILD_FOR_STEP',
      step: state.step,
      isAlert: true,
    });
  });
});
