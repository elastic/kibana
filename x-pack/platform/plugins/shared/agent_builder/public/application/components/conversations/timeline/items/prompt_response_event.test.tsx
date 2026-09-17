/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import type { PromptResponseEvent as PromptResponseEventData } from '@kbn/agent-builder-common';
import { PromptResponseEvent } from './prompt_response_event';
import { createPromptResponseEvent } from './prompt_response_event.factory';
import { createConfirmationPrompt } from './prompt_request_event.factory';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const responseEvent = (responses: PromptResponseEventData['data']['responses']) =>
  createPromptResponseEvent({ data: { prompt_requested_event_id: 'term-1', responses } });

describe('PromptResponseEvent', () => {
  it('renders an answered confirmation with its original title and message when the definition is joined', () => {
    const prompt = createConfirmationPrompt({
      id: 'c1',
      title: 'Delete `logs` index?',
      message: 'This removes the index permanently.',
    });
    renderWithProviders(
      <PromptResponseEvent event={responseEvent({ c1: { allow: true } })} prompts={[prompt]} />
    );

    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
    expect(screen.getByRole('code')).toHaveTextContent('logs');
    expect(screen.getByText('This removes the index permanently.')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConfirmationPromptConfirmButton')).toBeDisabled();
  });

  it('falls back to a generic Approved/Denied badge when the confirmation definition is missing', () => {
    renderWithProviders(<PromptResponseEvent event={responseEvent({ c1: { allow: false } })} />);

    expect(screen.queryByTestId('agentBuilderConfirmationPrompt')).not.toBeInTheDocument();
    expect(screen.getByText('Denied')).toBeInTheDocument();
  });

  it('falls back to a generic Authorized badge when the authorization definition is missing', () => {
    renderWithProviders(
      <PromptResponseEvent event={responseEvent({ a1: { authorized: true } })} />
    );

    expect(screen.getByText('Authorized')).toBeInTheDocument();
  });

  it('joins each answer with its own definition by prompt id in a mixed batch', () => {
    const confirmation = createConfirmationPrompt({ id: 'c1', title: 'Confirm c1' });
    renderWithProviders(
      <PromptResponseEvent
        event={responseEvent({ c1: { allow: true }, a1: { authorized: false } })}
        prompts={[confirmation]}
      />
    );

    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  it('renders nothing for an ask_user_question-only response', () => {
    const { container } = renderWithProviders(
      <PromptResponseEvent event={responseEvent({ q1: { answers: [{ choice: [0] }] } })} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
