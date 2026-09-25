/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createExecutionPausedEvent } from './items/execution_paused_event.factory';
import { createExecutionFailedEvent } from './items/execution_failed_event.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted_event.factory';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { TimelineItem } from './types';
import { Timeline } from './timeline';

jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => 'conv-1',
}));
jest.mock('./response/response_message', () => ({
  ResponseMessage: ({
    isLoading,
    conversationId,
    attachmentRefs,
    conversationAttachments,
  }: {
    isLoading: boolean;
    conversationId?: string;
    attachmentRefs?: Array<{ attachment_id: string }>;
    conversationAttachments?: Array<{ id: string }>;
  }) => (
    <div
      data-test-subj="response"
      data-conversation-id={conversationId}
      data-refs={attachmentRefs?.map((ref) => ref.attachment_id).join(',')}
      data-attachments={conversationAttachments?.map((attachment) => attachment.id).join(',')}
    >
      {isLoading ? 'loading' : 'done'}
    </div>
  ),
}));
jest.mock('./attachments/attachment_references', () => ({
  AttachmentReferences: ({
    attachmentRefs,
    actorFilter,
  }: {
    attachmentRefs?: Array<{ attachment_id: string }>;
    actorFilter?: string[];
  }) => (
    <div
      data-test-subj="references"
      data-refs={attachmentRefs?.map((ref) => ref.attachment_id).join(',')}
      data-actors={actorFilter?.join(',')}
    />
  ),
}));

const steps = [
  createToolCallStep({ tool_call_id: 'tc-1', tool_id: 'search', params: {}, results: [] }),
  createToolCallStep({ tool_call_id: 'tc-2', tool_id: 'read', params: {}, results: [] }),
];
const executionId = 'round-1::execution';

const running: TimelineItem = {
  kind: 'agentTurn',
  key: executionId,
  executionId,
  status: 'running',
  startedAt: '2026-01-01T00:00:00.000Z',
  steps,
  response: { message: 'Hel' },
};
const terminal = createExecutionTerminatedEvent({ execution_id: executionId });
const completedLive: TimelineItem = {
  ...running,
  status: 'completed',
  terminal,
  response: undefined,
};
const completedSaved: TimelineItem = { ...completedLive, steps: [...steps] };
const failed: TimelineItem = {
  ...running,
  status: 'failed',
  terminal: createExecutionFailedEvent({ execution_id: executionId }),
  response: undefined,
};
const aborted: TimelineItem = {
  ...running,
  status: 'aborted',
  terminal: createExecutionAbortedEvent({ execution_id: executionId }),
  response: undefined,
};

const renderTimeline = (item: TimelineItem, conversationAttachments?: VersionedAttachment[]) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <Timeline items={[item]} conversationAttachments={conversationAttachments} />
      </EuiProvider>
    </I18nProvider>
  );

describe('AgentTurn', () => {
  it('gives the response what it needs to render attachments', () => {
    const conversationAttachments = [{ id: 'att-1' } as VersionedAttachment];
    renderTimeline(
      {
        ...completedSaved,
        attachmentRefs: [{ attachment_id: 'att-1', version: 2 }],
        triggerAttachmentRefs: [{ attachment_id: 'att-2', version: 1 }],
      },
      conversationAttachments
    );

    const response = screen.getByTestId('response');
    expect(response).toHaveAttribute('data-conversation-id', 'conv-1');
    expect(response).toHaveAttribute('data-refs', 'att-1');
    expect(response).toHaveAttribute('data-attachments', 'att-1');

    const references = screen.getByTestId('references');
    expect(references).toHaveAttribute('data-refs', 'att-2');
    expect(references).toHaveAttribute('data-actors', 'agent,system');
  });

  it('lists attachments created in the turn only once it has completed', () => {
    renderTimeline({ ...running, triggerAttachmentRefs: [{ attachment_id: 'att-2', version: 1 }] });

    expect(screen.queryByTestId('references')).not.toBeInTheDocument();
  });

  it('renders the steps of an answered pause even though it has no response', () => {
    const answeredPause: TimelineItem = {
      ...completedSaved,
      terminal: createExecutionPausedEvent({ execution_id: executionId }),
    };
    renderTimeline(answeredPause);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
  });

  it('renders the steps that ran above a collapsed error line for a failed turn', () => {
    renderTimeline(failed);

    fireEvent.click(screen.getByRole('button', { name: /tool/ }));
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByText('2 tools stopped')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderExecutionFailedToggle')).toHaveTextContent(
      'An error occurred'
    );
    expect(screen.queryByTestId('agentBuilderExecutionError')).not.toBeInTheDocument();
  });

  it('expands the error details on click and keeps them open through the saved replacement', () => {
    const { rerender } = renderTimeline(failed);

    fireEvent.click(screen.getByTestId('agentBuilderExecutionFailedToggle'));
    expect(screen.getByTestId('agentBuilderExecutionError')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderExecutionErrorRetryButton')).not.toBeInTheDocument();

    rerender(
      <I18nProvider>
        <EuiProvider>
          <Timeline items={[{ ...failed, steps: [...steps] }]} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getByTestId('agentBuilderExecutionError')).toBeInTheDocument();
  });

  it('renders the steps that ran above the stopped notice for an aborted turn', () => {
    renderTimeline(aborted);

    fireEvent.click(screen.getByRole('button', { name: /tool/ }));
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByText('2 tools stopped')).toBeInTheDocument();
    expect(screen.getByText('Response stopped by petr')).toBeInTheDocument();
  });

  it('keeps an expanded tool group open through completion and the saved replacement', () => {
    const { rerender } = renderTimeline(running);
    expect(screen.queryByTestId('agentBuilderToolCallStep')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByTestId('response')).toHaveTextContent('loading');

    rerender(
      <I18nProvider>
        <EuiProvider>
          <Timeline items={[completedLive]} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByTestId('response')).toHaveTextContent('done');

    rerender(
      <I18nProvider>
        <EuiProvider>
          <Timeline items={[completedSaved]} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
  });
});
