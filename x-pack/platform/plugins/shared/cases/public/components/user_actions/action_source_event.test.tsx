/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../common/mock';
import { useKibana } from '../../common/lib/kibana';
import { withActionSourceEvent } from './action_source_event';
import { useCanOpenAgentConversation } from './use_can_open_agent_conversation';

jest.mock('../../common/lib/kibana');
jest.mock('./use_can_open_agent_conversation');

const mockOpenChat = jest.fn();
const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
);

const useKibanaMock = useKibana as jest.Mock;
const useCanOpenAgentConversationMock = useCanOpenAgentConversation as jest.MockedFunction<
  typeof useCanOpenAgentConversation
>;

const renderEvent = (event: React.ReactNode, source: unknown) =>
  render(<TestProviders>{withActionSourceEvent(event, source)}</TestProviders>);

describe('withActionSourceEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCanOpenAgentConversationMock.mockImplementation((conversationId) => Boolean(conversationId));
    useKibanaMock.mockReturnValue({
      services: {
        agentBuilder: { openChat: mockOpenChat },
        application: {
          getUrlForApp: mockGetUrlForApp,
          capabilities: { workflowsManagement: { readWorkflow: true } },
        },
      },
    });
  });

  it('returns the original event when source is missing', () => {
    renderEvent('created case "a title"', undefined);

    expect(screen.getByText('created case "a title"')).toBeInTheDocument();
    expect(screen.queryByTestId('user-action-via-source')).not.toBeInTheDocument();
  });

  it('returns the original event when source is invalid', () => {
    renderEvent('created case "a title"', { type: 'agent' });

    expect(screen.getByText('created case "a title"')).toBeInTheDocument();
    expect(screen.queryByTestId('user-action-via-source')).not.toBeInTheDocument();
  });

  it('does not prefix user sources on the header', () => {
    renderEvent('created case "a title"', { type: 'user', id: 'user' });

    expect(screen.getByText('created case "a title"')).toBeInTheDocument();
    expect(screen.queryByTestId('user-action-via-source')).not.toBeInTheDocument();
  });

  it.each([
    ['agent', 'Elastic AI Agent', 'via Elastic AI Agent'],
    ['workflow', 'Escalate to SOC', 'via Escalate to SOC'],
    ['rule', 'Create a case', 'via Create a case'],
    ['attack', 'Daily discoveries', 'via Daily discoveries'],
    ['api', 'Cases API client', 'via Cases API client'],
  ] as const)('prefixes %s source with a name', (type, name, expected) => {
    renderEvent('created case "a title"', { type, id: `${type}-1`, name });

    expect(screen.getByText(/created case "a title"/)).toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent(expected);
  });

  it.each([
    ['agent', 'via Agent'],
    ['workflow', 'via Workflow'],
    ['rule', 'via Rule'],
    ['attack', 'via Attack Discovery'],
    ['api', 'via API'],
  ] as const)('prefixes %s source without a name', (type, expected) => {
    renderEvent('added a comment', { type, id: `${type}-1` });

    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent(expected);
  });

  it('treats a blank name as missing', () => {
    renderEvent('created case "a title"', { type: 'agent', id: 'agent-1', name: '   ' });

    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Agent');
  });

  it('preserves a ReactNode event', () => {
    renderEvent(<span data-test-subj="original-event">{'added a comment'}</span>, {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
    });

    expect(screen.getByTestId('original-event')).toHaveTextContent('added a comment');
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Elastic AI Agent');
  });

  it('keeps a space between via and the event', () => {
    const { container } = renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
    });

    expect(container).toHaveTextContent('via Elastic AI Agent created case "a title"');
  });

  it('opens the assistant flyout when the agent name is clicked', async () => {
    renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
      runId: 'conv-1',
    });

    await userEvent.click(screen.getByTestId('user-action-via-source-link'));

    expect(mockOpenChat).toHaveBeenCalledWith({
      agentId: 'agent-1',
      conversationId: 'conv-1',
    });
  });

  it('opens the flyout using run_id when runId is absent', async () => {
    renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
      run_id: 'conv-1',
    });

    await userEvent.click(screen.getByTestId('user-action-via-source-link'));

    expect(mockOpenChat).toHaveBeenCalledWith({
      agentId: 'agent-1',
      conversationId: 'conv-1',
    });
  });

  it('does not link the agent name when a run id is missing', () => {
    renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
    });

    expect(screen.queryByTestId('user-action-via-source-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Elastic AI Agent');
  });

  it('does not link when the assistant flyout is unavailable', () => {
    useCanOpenAgentConversationMock.mockReturnValue(false);
    useKibanaMock.mockReturnValue({ services: {} });

    renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
      runId: 'conv-1',
    });

    expect(screen.queryByTestId('user-action-via-source-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Elastic AI Agent');
  });

  it('does not link the agent name when the conversation is not readable', () => {
    useCanOpenAgentConversationMock.mockReturnValue(false);

    renderEvent('created case "a title"', {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
      runId: 'conv-1',
    });

    expect(screen.queryByTestId('user-action-via-source-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Elastic AI Agent');
  });

  it('links the workflow name to the workflow', () => {
    renderEvent('created case "a title"', {
      type: 'workflow',
      id: 'wf-1',
      name: 'Escalate to SOC',
    });

    expect(screen.getByTestId('user-action-via-source-link')).toHaveAttribute(
      'href',
      '/app/workflows/wf-1'
    );
    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', { path: '/wf-1' });
  });

  it('links the workflow name to the execution when a run id is present', () => {
    renderEvent('created case "a title"', {
      type: 'workflow',
      id: 'wf-1',
      name: 'Escalate to SOC',
      runId: 'exec-1',
    });

    expect(screen.getByTestId('user-action-via-source-link')).toHaveAttribute(
      'href',
      '/app/workflows/wf-1?tab=executions&executionId=exec-1'
    );
  });

  it('links an unnamed workflow using the kind label', () => {
    renderEvent('added a comment', { type: 'workflow', id: 'wf-1' });

    expect(screen.getByTestId('user-action-via-source-link')).toHaveTextContent('Workflow');
    expect(screen.getByTestId('user-action-via-source-link')).toHaveAttribute(
      'href',
      '/app/workflows/wf-1'
    );
  });

  it('does not link the workflow name when the workflows app is unavailable', () => {
    useKibanaMock.mockReturnValue({
      services: { agentBuilder: { openChat: mockOpenChat } },
    });

    renderEvent('created case "a title"', {
      type: 'workflow',
      id: 'wf-1',
      name: 'Escalate to SOC',
    });

    expect(screen.queryByTestId('user-action-via-source-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Escalate to SOC');
  });

  it('does not link the workflow name when read privilege is missing', () => {
    useKibanaMock.mockReturnValue({
      services: {
        agentBuilder: { openChat: mockOpenChat },
        application: {
          getUrlForApp: mockGetUrlForApp,
          capabilities: { workflowsManagement: { readWorkflow: false } },
        },
      },
    });

    renderEvent('created case "a title"', {
      type: 'workflow',
      id: 'wf-1',
      name: 'Escalate to SOC',
    });

    expect(screen.queryByTestId('user-action-via-source-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Escalate to SOC');
  });
});
