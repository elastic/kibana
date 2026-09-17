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
import type { TimelineItem } from './to_timeline_items';
import { Timeline } from './timeline';

jest.mock('../conversation_rounds/round_response/response_message', () => ({
  ResponseMessage: ({ isLoading }: { isLoading: boolean }) => (
    <div data-test-subj="response">{isLoading ? 'loading' : 'done'}</div>
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

const renderTimeline = (item: TimelineItem) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <Timeline items={[item]} />
      </EuiProvider>
    </I18nProvider>
  );

describe('AgentTurn', () => {
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
