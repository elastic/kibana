/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createTestQueryClient, createMockServices } from '../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../form/contexts';
import { createInitialState } from './use_compose_discover_state';
import { getSteps } from './compose_discover_form';
import type { ComposeDiscoverState } from './types';
import type { ComposeFormValues, RuleQuery } from './compose_form_types';

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: ({ value }: { value: string }) => <pre data-test-subj="codeEditorMock">{value}</pre>,
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const BASE_QUERY = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_BLOCK = '| WHERE count > 100';
const RECOVERY_BLOCK = '| WHERE count < 100';

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
  blocks: { breach: ALERT_BLOCK, recover: RECOVERY_BLOCK },
};

const CUSTOM_NO_RECOVERY_QUERY: RuleQuery = {
  format: 'composed',
  base: BASE_QUERY,
  blocks: { breach: ALERT_BLOCK },
};

const renderRecoveryStep = (
  stateOverrides: Partial<ComposeDiscoverState> = {},
  queryOverride?: RuleQuery
) => {
  const state = createState({
    tracking: true,
    queryCommitted: true,
    ...stateOverrides,
  });
  const dispatch = jest.fn();
  const onRecoveryTypeChange = jest.fn();
  const services = createMockServices();
  const steps = getSteps(true);
  const recoveryStep = steps.find((s) => s.id === 'recoveryCondition')!;

  render(
    recoveryStep.render({
      state,
      dispatch,
      services,
      onEnableTracking: jest.fn(),
      onDisableTracking: jest.fn(),
      onRecoveryTypeChange,
    }) as React.ReactElement,
    { wrapper: createComposeFormWrapper(queryOverride, services) }
  );

  return { dispatch, state, onRecoveryTypeChange };
};

// ── step validation ───────────────────────────────────────────────────────────

describe('step validation', () => {
  describe('alertCondition.validate', () => {
    const alertStep = getSteps(false).find((s) => s.id === 'alertCondition')!;

    it('returns true when queryCommitted is true', async () => {
      const state = createState({ queryCommitted: true });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(true);
    });

    it('returns false when queryCommitted is false', async () => {
      const state = createState({ queryCommitted: false });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(false);
    });
  });

  describe('details.validate', () => {
    const detailsStep = getSteps(false).find((s) => s.id === 'details')!;

    it('delegates to methods.trigger with metadata.name', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(true),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(methods.trigger).toHaveBeenCalledWith(['metadata.name']);
      expect(result).toBe(true);
    });

    it('returns false when trigger rejects validation', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(false),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(result).toBe(false);
    });
  });

  describe('steps without validate', () => {
    it('recoveryCondition has no validate function', () => {
      const recoveryStep = getSteps(true).find((s) => s.id === 'recoveryCondition')!;
      expect(recoveryStep.validate).toBeUndefined();
    });

    it('notifications has no validate function', () => {
      const notificationsStep = getSteps(false).find((s) => s.id === 'notifications')!;
      expect(notificationsStep.validate).toBeUndefined();
    });
  });
});

// ── RecoveryConditionStep rendering ───────────────────────────────────────────

describe('RecoveryConditionStep', () => {
  it('renders the recovery type selector in default mode', () => {
    renderRecoveryStep({ recoveryType: 'default' });

    expect(screen.getByTestId('composeDiscoverRecoveryType')).toBeInTheDocument();
  });

  it('does not render query summaries or edit button in default mode', () => {
    renderRecoveryStep({ recoveryType: 'default' });

    expect(screen.queryByText('Base query')).not.toBeInTheDocument();
    expect(screen.queryByText('Recovery condition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEditRecovery')).not.toBeInTheDocument();
  });

  it('renders query summaries and edit button in custom mode', () => {
    renderRecoveryStep({ recoveryType: 'custom' }, CUSTOM_RECOVERY_QUERY);

    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(screen.getByText('Recovery condition')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEditRecovery')).toBeInTheDocument();
  });

  it('shows "Custom condition set" badge when recovery block is populated', () => {
    renderRecoveryStep({ recoveryType: 'custom' }, CUSTOM_RECOVERY_QUERY);

    expect(screen.getByText('Custom condition set')).toBeInTheDocument();
  });

  it('does not show badge when recovery block is empty', () => {
    renderRecoveryStep({ recoveryType: 'custom' }, CUSTOM_NO_RECOVERY_QUERY);

    expect(screen.queryByText('Custom condition set')).not.toBeInTheDocument();
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

    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_CHILD_FOR_STEP', step: state.step });
  });
});
