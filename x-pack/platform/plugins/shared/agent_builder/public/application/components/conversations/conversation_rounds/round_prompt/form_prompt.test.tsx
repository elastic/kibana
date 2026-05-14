/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { FormPromptRequest, FormPromptResponse } from '@kbn/agent-builder-common/agents';
import { FormPrompt } from './form_prompt';

const SCHEMA = {
  properties: {
    approved: { default: true, title: 'Approved', type: 'boolean' as const },
    reason: { title: 'Reason', type: 'string' as const },
    severity: { enum: ['low', 'high'], title: 'Severity', type: 'string' as const },
  },
  required: ['reason', 'severity'],
  type: 'object' as const,
};

const defaultPrompt: FormPromptRequest = {
  execution_id: 'exec-1',
  id: 'prompt-1',
  message: 'Please fill out this form',
  schema: SCHEMA,
  step_execution_id: 'step-1',
  type: AgentPromptType.form,
};

const renderPrompt = (props: Partial<React.ComponentProps<typeof FormPrompt>> = {}) =>
  render(
    <IntlProvider locale="en">
      <FormPrompt
        isAnswered={false}
        isDisabled={false}
        isLoading={false}
        onSubmit={jest.fn()}
        prompt={defaultPrompt}
        {...props}
      />
    </IntlProvider>
  );

describe('FormPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the prompt message', () => {
    renderPrompt();

    expect(screen.getByText('Please fill out this form')).toBeInTheDocument();
  });

  it('renders a boolean toggle for the approved field', () => {
    renderPrompt();

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders a text field for the reason field', () => {
    renderPrompt();

    expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument();
  });

  it('renders enum options for the severity field', () => {
    renderPrompt();

    expect(screen.getByRole('option', { name: 'low' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'high' })).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderPrompt();

    expect(screen.getByTestId('agentBuilderFormPromptSubmitButton')).toBeInTheDocument();
  });

  it('does not call onSubmit when required fields are empty', () => {
    const onSubmit = jest.fn();
    renderPrompt({ onSubmit });

    fireEvent.click(screen.getByTestId('agentBuilderFormPromptSubmitButton'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct payload when required fields are filled', () => {
    const onSubmit = jest.fn();
    renderPrompt({ onSubmit });

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: 'all good' },
    });

    const severitySelect = screen.getByLabelText(/severity/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    fireEvent.click(screen.getByTestId('agentBuilderFormPromptSubmitButton'));

    const expected: FormPromptResponse = {
      execution_id: 'exec-1',
      id: 'prompt-1',
      values: expect.objectContaining({
        reason: 'all good',
        severity: 'high',
      }) as Record<string, unknown>,
    };
    expect(onSubmit).toHaveBeenCalledWith(expected);
  });

  it('disables the form and submit button when isDisabled is true', () => {
    renderPrompt({ isDisabled: true });

    expect(screen.getByTestId('agentBuilderFormPromptSubmitButton')).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /reason/i })).toBeDisabled();
  });

  it('disables the form and submit button when isAnswered is true', () => {
    renderPrompt({ isAnswered: true });

    expect(screen.getByTestId('agentBuilderFormPromptSubmitButton')).toBeDisabled();
  });

  it('shows answered values in the form when isAnswered is true', () => {
    renderPrompt({
      answeredValues: { approved: true, reason: 'done', severity: 'low' },
      isAnswered: true,
    });

    expect((screen.getByRole('textbox', { name: /reason/i }) as HTMLInputElement).value).toBe(
      'done'
    );
  });
});

// ---------------------------------------------------------------------------
// R4: cross-tab staleness UX contract
// ---------------------------------------------------------------------------

describe('FormPrompt — R4 cross-tab staleness UX', () => {
  it('marks the submit button disabled when isDisabled flips to true (simulates remote tab submitting first)', () => {
    const { rerender } = render(
      <IntlProvider locale="en">
        <FormPrompt
          isAnswered={false}
          isDisabled={false}
          isLoading={false}
          onSubmit={jest.fn()}
          prompt={defaultPrompt}
        />
      </IntlProvider>
    );

    // Simulate the server confirming the other tab's submission
    rerender(
      <IntlProvider locale="en">
        <FormPrompt
          isAnswered={true}
          isDisabled={true}
          isLoading={false}
          onSubmit={jest.fn()}
          prompt={defaultPrompt}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('agentBuilderFormPromptSubmitButton')).toBeDisabled();
  });

  it('does not call onSubmit after isAnswered flips to true (stale tab cannot re-submit)', () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <IntlProvider locale="en">
        <FormPrompt
          isAnswered={false}
          isDisabled={false}
          isLoading={false}
          onSubmit={onSubmit}
          prompt={defaultPrompt}
        />
      </IntlProvider>
    );

    // Remote tab wins
    rerender(
      <IntlProvider locale="en">
        <FormPrompt
          answeredValues={{ reason: 'other tab', severity: 'low' }}
          isAnswered={true}
          isDisabled={true}
          isLoading={false}
          onSubmit={onSubmit}
          prompt={defaultPrompt}
        />
      </IntlProvider>
    );

    // Click submit on the now-stale form — should be a no-op
    fireEvent.click(screen.getByTestId('agentBuilderFormPromptSubmitButton'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
