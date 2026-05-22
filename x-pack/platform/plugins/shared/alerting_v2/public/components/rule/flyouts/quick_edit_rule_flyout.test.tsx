/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { QuickEditRuleFlyout } from './quick_edit_rule_flyout';
import type { RuleApiResponse } from '../../../services/rules_api';

const mockMutate = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({}),
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_update_rule', () => ({
  useUpdateRule: () => ({
    mutate: mockMutate,
    isLoading: false,
  }),
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  RuleFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RuleDetailsFieldGroup: () => <div data-test-subj="mockRuleDetailsFieldGroup" />,
  ConditionFieldGroup: () => <div data-test-subj="mockConditionFieldGroup" />,
  RuleExecutionFieldGroup: () => <div data-test-subj="mockRuleExecutionFieldGroup" />,
  AlertConditionsFieldGroup: () => <div data-test-subj="mockAlertConditionsFieldGroup" />,
  KindField: ({ disabled, compact }: { disabled?: boolean; compact?: boolean }) => (
    <div data-test-subj="mockKindField" data-disabled={disabled} data-compact={compact} />
  ),
  mapRuleResponseToFormValues: (rule: unknown) => ({
    kind: 'alert',
    metadata: { name: 'Test Rule', enabled: true, description: '', tags: [] },
    timeField: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    evaluation: { query: { base: 'FROM logs-*' } },
    recoveryPolicy: { type: 'no_breach' },
    stateTransitionAlertDelayMode: 'immediate',
    stateTransitionRecoveryDelayMode: 'immediate',
  }),
  mapFormValuesToUpdateRequest: (values: unknown) => values,
}));

const baseRule = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule' },
} as RuleApiResponse;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderFlyout = (
  overrides: Partial<React.ComponentProps<typeof QuickEditRuleFlyout>> = {}
) => {
  const props = {
    rule: baseRule,
    onClose: jest.fn(),
    ...overrides,
  };

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <QuickEditRuleFlyout {...props} />
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...utils, props };
};

describe('QuickEditRuleFlyout', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('renders the flyout with the title and info tooltip', () => {
    renderFlyout();

    expect(screen.getByTestId('quickEditRuleFlyout')).toBeInTheDocument();
    expect(screen.getByText('Quick Edit Alert Rule')).toBeInTheDocument();
  });

  it('renders all field groups', () => {
    renderFlyout();

    expect(screen.getByTestId('mockRuleDetailsFieldGroup')).toBeInTheDocument();
    expect(screen.getByTestId('mockConditionFieldGroup')).toBeInTheDocument();
    expect(screen.getByTestId('mockRuleExecutionFieldGroup')).toBeInTheDocument();
    expect(screen.getByTestId('mockAlertConditionsFieldGroup')).toBeInTheDocument();
  });

  it('renders KindField as disabled and compact', () => {
    renderFlyout();

    const kindField = screen.getByTestId('mockKindField');
    expect(kindField).toHaveAttribute('data-disabled', 'true');
    expect(kindField).toHaveAttribute('data-compact', 'true');
  });

  it('calls onClose when the close button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('quickEditRuleFlyoutCloseButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('quickEditRuleFlyoutCancelButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls updateRule.mutate with the rule id when the form is submitted', async () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('quickEditRuleFlyoutSubmitButton'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rule-1' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  it('calls onClose on successful mutation', async () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('quickEditRuleFlyoutSubmitButton'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    const { onSuccess } = mockMutate.mock.calls[0][1];
    onSuccess();

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the mutation fails', async () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('quickEditRuleFlyoutSubmitButton'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    expect(props.onClose).not.toHaveBeenCalled();
  });
});
