/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleExecutionView, RuleResponse } from '@kbn/alerting-v2-schemas';
import { useRuleDiagnoseButton } from './use_rule_diagnose_button';

const mockGetRule = jest.fn();
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ getRule: (...args: unknown[]) => mockGetRule(...args) }),
}));

let mockAvailability: Record<string, unknown> = {};
jest.mock('./use_diagnose_availability', () => ({
  useDiagnoseAvailability: () => mockAvailability,
}));

const execution: RuleExecutionView = {
  id: 'exec-1',
  rule: { id: 'rule-1' },
  started_at: '2026-11-09T16:00:00.000Z',
  ended_at: '2026-11-09T16:00:01.000Z',
  timings: { duration_ms: 1000, scheduled_delay_ms: 0 },
  outcome: 'failure',
  error: { message: 'Unknown column [x]' },
};

const getRuleName = jest.fn((ruleId: string) => (ruleId === 'rule-1' ? 'Cached rule' : undefined));

const setAvailability = (overrides: Record<string, unknown> = {}) => {
  mockAvailability = {
    state: 'a',
    requiredLicenseTier: 'enterprise',
    isHandoffInFlight: false,
    openDiagnose: jest.fn(),
    openLicenseManagement: jest.fn(),
    licenseManagementHref: '/app/management/stack/license_management',
    ...overrides,
  };
  return mockAvailability as {
    openDiagnose: jest.Mock;
    openLicenseManagement: jest.Mock;
  };
};

const renderButton = (item: RuleExecutionView = execution) => {
  const { result } = renderHook(() => useRuleDiagnoseButton({ getRuleName }));
  return render(<I18nProvider>{result.current(item)}</I18nProvider>);
};

describe('useRuleDiagnoseButton', () => {
  beforeEach(() => {
    mockGetRule.mockReset();
    getRuleName.mockClear();
  });

  it('renders nothing in state D', () => {
    setAvailability({ state: 'd' });
    const { result } = renderHook(() => useRuleDiagnoseButton({ getRuleName }));

    expect(result.current(execution)).toBeNull();
  });

  it.each(['a', 'b'])(
    'renders a labelled "Diagnose with AI" button with the sparkles icon in state %s',
    (state) => {
      setAvailability({ state });
      renderButton();

      const button = screen.getByTestId('ruleExecutionDiagnoseButton');
      expect(button).toHaveTextContent('Diagnose with AI');
      expect(button).toBeEnabled();
    }
  );

  it('diagnoses with the saved rule: fetches it, names the context after it, and opens the chat', async () => {
    const { openDiagnose } = setAvailability();
    const rule = { id: 'rule-1', metadata: { name: 'Saved rule' } } as unknown as RuleResponse;
    mockGetRule.mockResolvedValue(rule);
    renderButton();

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(openDiagnose).toHaveBeenCalledTimes(1));
    expect(mockGetRule).toHaveBeenCalledWith('rule-1');
    expect(openDiagnose).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-1',
        ruleName: 'Saved rule',
        executionId: 'exec-1',
        rule,
      })
    );
  });

  it('falls back to the cached name and no rule attachment when the rule cannot be read', async () => {
    const { openDiagnose } = setAvailability();
    mockGetRule.mockRejectedValue(new Error('404'));
    renderButton();

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(openDiagnose).toHaveBeenCalledTimes(1));
    expect(openDiagnose).toHaveBeenCalledWith(
      expect.objectContaining({ ruleName: 'Cached rule', rule: null })
    );
  });

  it('falls back to the rule id when the name is unknown everywhere', async () => {
    const { openDiagnose } = setAvailability();
    mockGetRule.mockRejectedValue(new Error('404'));
    renderButton({ ...execution, rule: { id: 'rule-orphan' } });

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(openDiagnose).toHaveBeenCalledTimes(1));
    expect(openDiagnose).toHaveBeenCalledWith(
      expect.objectContaining({ ruleName: 'rule-orphan', ruleId: 'rule-orphan' })
    );
  });

  it('disables the button while a handoff is in flight', () => {
    setAvailability({ isHandoffInFlight: true });
    renderButton();

    expect(screen.getByTestId('ruleExecutionDiagnoseButton')).toBeDisabled();
  });

  it('shows the license teaser in state C and opens license management instead of the chat', async () => {
    const { openDiagnose, openLicenseManagement } = setAvailability({ state: 'c' });
    renderButton();

    expect(screen.queryByTestId('ruleExecutionDiagnoseButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleExecutionDiagnoseLicenseTeaser')).toHaveTextContent(
      'Diagnose with AI — requires enterprise license'
    );

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseLicenseLink'));

    expect(openLicenseManagement).toHaveBeenCalledTimes(1);
    expect(openDiagnose).not.toHaveBeenCalled();
    expect(mockGetRule).not.toHaveBeenCalled();
  });
});
