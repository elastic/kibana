/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { createTestQueryClient, createMockServices } from '../../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { FormValues, RuleQuery, RuleRecovery } from '../../../form/types';
import {
  RecoveryConditionStep,
  RECOVERY_CONDITION_REQUIRES_BREACH_ERROR,
} from './recovery_condition_step';
import { EsqlRecoveryContent } from './esql_recovery_content';

const BASE_QUERY = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_SEGMENT = 'WHERE count > 100';
const RECOVERY_SEGMENT = 'WHERE count < 100';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: FormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: '', breach: { segment: '' } },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

let formMethodsRef: UseFormReturn<FormValues> | undefined;

const createComposeFormWrapper = (
  queryOverride?: RuleQuery,
  services: RuleFormServices = createMockServices(),
  recovery?: RuleRecovery
) => {
  const queryClient = createTestQueryClient();
  const defaultValues: FormValues = {
    ...BASE_COMPOSE_VALUES,
    ...(queryOverride ? { query: queryOverride } : {}),
    ...(recovery ? { recovery } : {}),
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm<FormValues>({ defaultValues });
    formMethodsRef = form;
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

const SPLIT_QUERY: RuleQuery = {
  base: BASE_QUERY,
  breach: { segment: ALERT_SEGMENT },
};

const CONDITION_RECOVERY: RuleRecovery = {
  strategy: recoveryStrategy.condition,
  segment: RECOVERY_SEGMENT,
};

const renderRecoveryStep = (
  recovery?: RuleRecovery,
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

  const view = render(
    <RecoveryConditionStep
      state={state}
      dispatch={dispatch}
      onRecoveryTypeChange={onRecoveryTypeChange}
      renderCustomRecovery={EsqlRecoveryContent}
    />,
    { wrapper: createComposeFormWrapper(queryOverride, services, recovery) }
  );

  return { dispatch, state, onRecoveryTypeChange, view, services };
};

describe('RecoveryConditionStep', () => {
  it('renders the recovery type selector in default mode', () => {
    renderRecoveryStep({ strategy: recoveryStrategy.no_breach });

    expect(screen.getByTestId('composeDiscoverRecoveryType')).toBeInTheDocument();
  });

  it('does not render query summaries or edit button in default mode', () => {
    renderRecoveryStep({ strategy: recoveryStrategy.no_breach });

    expect(screen.queryByText('Base query')).not.toBeInTheDocument();
    expect(screen.queryByText('Recovery condition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEditRecovery')).not.toBeInTheDocument();
  });

  it('does not render custom recovery content when recovery type is manual', () => {
    renderRecoveryStep({ strategy: recoveryStrategy.manual });

    expect(screen.queryByText('Base query')).not.toBeInTheDocument();
    expect(screen.queryByText('Recovery condition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEditRecovery')).not.toBeInTheDocument();
  });

  it('renders the recovery delay field when recovery type is default', () => {
    renderRecoveryStep({ strategy: recoveryStrategy.no_breach });

    expect(screen.getByTestId('recoveryDelayFormRow')).toBeInTheDocument();
  });

  it('renders the recovery delay field when recovery type is a custom condition', () => {
    renderRecoveryStep(CONDITION_RECOVERY, {}, SPLIT_QUERY);

    expect(screen.getByTestId('recoveryDelayFormRow')).toBeInTheDocument();
  });

  it('hides the recovery delay field when recovery type is manual (delay is inert)', () => {
    renderRecoveryStep({ strategy: recoveryStrategy.manual });

    expect(screen.queryByTestId('recoveryDelayFormRow')).not.toBeInTheDocument();
  });

  it('renders query summaries and edit button in custom mode', () => {
    renderRecoveryStep(CONDITION_RECOVERY, {}, SPLIT_QUERY);

    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(screen.getByText('Recovery condition')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeInTheDocument();
  });

  it('disables the edit button when the child flyout is open', () => {
    renderRecoveryStep(CONDITION_RECOVERY, { childOpen: true }, SPLIT_QUERY);

    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeDisabled();
  });

  it('dispatches OPEN_CHILD_FOR_STEP on edit button click', () => {
    const { dispatch, state } = renderRecoveryStep(
      CONDITION_RECOVERY,
      { childOpen: false, step: 1 },
      SPLIT_QUERY
    );

    fireEvent.click(screen.getByTestId('composeDiscoverEditRecovery'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_CHILD_FOR_STEP',
      step: state.step,
      isAlert: true,
      focusedTab: 'recovery',
    });
  });

  it('rejects a custom recovery condition when the query has no breach segment', async () => {
    renderRecoveryStep(CONDITION_RECOVERY, {}, { base: BASE_QUERY, breach: { segment: '' } });

    await act(async () => {
      await formMethodsRef?.trigger('recovery');
    });

    await waitFor(() => {
      expect(screen.getByText(RECOVERY_CONDITION_REQUIRES_BREACH_ERROR)).toBeInTheDocument();
    });
  });

  it('accepts a custom recovery condition when the query has a breach segment', async () => {
    renderRecoveryStep(CONDITION_RECOVERY, {}, SPLIT_QUERY);

    await act(async () => {
      await formMethodsRef?.trigger('recovery');
    });

    expect(screen.queryByText(RECOVERY_CONDITION_REQUIRES_BREACH_ERROR)).not.toBeInTheDocument();
  });

  it('toggles custom recovery content without a hooks-order warning', () => {
    // React reports a mismatched hook count as a console.error, not a thrown
    // exception — assert on the former; `.not.toThrow()` would pass either way.
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderRecoveryStep({ strategy: recoveryStrategy.no_breach }, {}, SPLIT_QUERY);

    act(() => {
      formMethodsRef?.setValue('recovery', CONDITION_RECOVERY, { shouldDirty: true });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
