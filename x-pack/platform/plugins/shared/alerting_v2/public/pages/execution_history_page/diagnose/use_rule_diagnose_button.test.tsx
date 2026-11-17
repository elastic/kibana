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
const mockOpenChat = jest.fn();
const mockAddError = jest.fn();
const mockHttp = { post: jest.fn() };
let mockAgentBuilder: Record<string, unknown> | undefined;
let mockCapability = true;

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    if (token === 'plugin:agentBuilder') return mockAgentBuilder;
    if (token === 'http') return mockHttp;
    if (token === 'notifications') return { toasts: { addError: mockAddError } };
    return { getRule: (...args: unknown[]) => mockGetRule(...args) };
  },
}));
jest.mock('../../../hooks/use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockCapability,
}));
jest.mock('./open_rule_failure_diagnosis_chat', () => ({
  openRuleFailureDiagnosisChat: (params: unknown) => mockOpenChat(params),
  diagnoseHandoffErrorToastTitle: () => 'Unable to start AI diagnosis',
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

const renderButton = (item: RuleExecutionView = execution) => {
  const { result } = renderHook(() => useRuleDiagnoseButton({ getRuleName }));
  return render(<I18nProvider>{result.current(item)}</I18nProvider>);
};

describe('useRuleDiagnoseButton', () => {
  beforeEach(() => {
    mockGetRule.mockReset();
    mockOpenChat.mockReset();
    mockAddError.mockReset();
    getRuleName.mockClear();
    mockAgentBuilder = { openChat: jest.fn() };
    mockCapability = true;
  });

  it('renders an enabled "Diagnose with AI" button when the user has the Agent Builder capability', () => {
    renderButton();

    const button = screen.getByTestId('ruleExecutionDiagnoseButton');
    expect(button).toHaveTextContent('Diagnose with AI');
    expect(button).toBeEnabled();
  });

  it('is disabled, not hidden, when the user lacks the Agent Builder capability', () => {
    mockCapability = false;
    renderButton();

    expect(screen.getByTestId('ruleExecutionDiagnoseButton')).toBeDisabled();
  });

  it('is disabled when the Agent Builder plugin is not available', () => {
    mockAgentBuilder = undefined;
    renderButton();

    expect(screen.getByTestId('ruleExecutionDiagnoseButton')).toBeDisabled();
  });

  it('explains the missing privilege in a tooltip on the disabled button', async () => {
    mockCapability = false;
    renderButton();

    await userEvent.hover(screen.getByTestId('ruleExecutionDiagnoseButton').parentElement!);

    expect(
      await screen.findByText(
        'To diagnose failures with the AI Agent, you need the "Agent Builder: Read" privilege.'
      )
    ).toBeInTheDocument();
  });

  it('does not show the privilege tooltip when the button is available', async () => {
    renderButton();

    await userEvent.hover(screen.getByTestId('ruleExecutionDiagnoseButton'));

    expect(screen.queryByText(/Agent Builder: Read/)).not.toBeInTheDocument();
  });

  it('diagnoses with the saved rule: fetches it, names the context after it, and opens the chat', async () => {
    const rule = { id: 'rule-1', metadata: { name: 'Saved rule' } } as unknown as RuleResponse;
    mockGetRule.mockResolvedValue(rule);
    renderButton();

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(mockOpenChat).toHaveBeenCalledTimes(1));
    expect(mockGetRule).toHaveBeenCalledWith('rule-1');
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        agentBuilder: mockAgentBuilder,
        http: mockHttp,
        context: expect.objectContaining({
          ruleId: 'rule-1',
          ruleName: 'Saved rule',
          executionId: 'exec-1',
          rule,
        }),
      })
    );
  });

  it('falls back to the cached name and no rule attachment when the rule cannot be read', async () => {
    mockGetRule.mockRejectedValue(new Error('404'));
    renderButton();

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(mockOpenChat).toHaveBeenCalledTimes(1));
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ ruleName: 'Cached rule', rule: null }),
      })
    );
  });

  it('falls back to the rule id when the name is unknown everywhere', async () => {
    mockGetRule.mockRejectedValue(new Error('404'));
    renderButton({ ...execution, rule: { id: 'rule-orphan' } });

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() => expect(mockOpenChat).toHaveBeenCalledTimes(1));
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ ruleName: 'rule-orphan', ruleId: 'rule-orphan' }),
      })
    );
  });

  it('toasts when opening the chat throws', async () => {
    mockGetRule.mockResolvedValue(null);
    mockOpenChat.mockImplementation(() => {
      throw new Error('openChat failed');
    });
    renderButton();

    await userEvent.click(screen.getByTestId('ruleExecutionDiagnoseButton'));

    await waitFor(() =>
      expect(mockAddError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Unable to start AI diagnosis',
      })
    );
  });
});
