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
import userEvent from '@testing-library/user-event';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  createModelReasoningStep,
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { AgentResponse } from './agent_response';

jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => 'conversation-1',
}));

jest.mock('./event_steps/event_steps', () => {
  // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
  const _React = require('react');
  return {
    EventSteps: () => _React.createElement('div', { 'data-test-subj': 'eventSteps' }),
  };
});

jest.mock('./response/response_message', () => {
  // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
  const _React = require('react');
  return {
    ResponseMessage: () => _React.createElement('div', { 'data-test-subj': 'responseMessage' }),
  };
});

jest.mock('./attachments/attachment_references', () => ({
  AttachmentReferences: () => null,
}));

const THOUGHTS = 'The chart covers 24 hours but the query has no time filter.';

const renderResponse = (steps: ConversationRoundStep[]) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AgentResponse
          steps={steps}
          response={{ message: 'Here are the 404s.' }}
          isLoading={false}
        />
      </EuiProvider>
    </I18nProvider>
  );

const toolStep = (groupId: string) =>
  createToolCallStep({
    tool_call_id: 'tc-1',
    tool_id: 'search',
    params: {},
    results: [],
    tool_call_group_id: groupId,
  });

describe('AgentResponse — model reasoning behind the answer', () => {
  it('shows a collapsed "Thought" row between the steps and the answer', async () => {
    renderResponse([toolStep('g1'), createModelReasoningStep({ reasoning: THOUGHTS })]);

    const sectionsInOrder = screen
      .getAllByTestId(/^(eventSteps|agentBuilderModelReasoningStep|responseMessage)$/)
      .map((section) => section.getAttribute('data-test-subj'));
    expect(sectionsInOrder).toEqual([
      'eventSteps',
      'agentBuilderModelReasoningStep',
      'responseMessage',
    ]);
    expect(screen.queryByText(THOUGHTS)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Thought' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('agentBuilderModelReasoning')).toHaveTextContent(THOUGHTS);
  });

  it('shows no "Thought" row when every model reasoning step belongs to a tool call group', () => {
    renderResponse([
      createModelReasoningStep({ reasoning: THOUGHTS, tool_call_group_id: 'g1' }),
      createReasoningStep({ reasoning: 'I will search the logs.', tool_call_group_id: 'g1' }),
      toolStep('g1'),
    ]);

    expect(screen.queryByTestId('agentBuilderModelReasoningStep')).not.toBeInTheDocument();
  });

  it('shows no "Thought" row when the turn has no model reasoning', () => {
    renderResponse([toolStep('g1')]);

    expect(screen.queryByTestId('agentBuilderModelReasoningStep')).not.toBeInTheDocument();
  });
});
