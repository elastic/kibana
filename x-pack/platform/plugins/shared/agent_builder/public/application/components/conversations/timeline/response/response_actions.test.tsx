/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copy from 'copy-to-clipboard';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createExecutionTerminatedEvent } from '../items/execution_terminated_event.factory';
import { ResponseActions } from './response_actions';
import { useToasts } from '../../../../hooks/use_toasts';

jest.mock('copy-to-clipboard');

jest.mock('../../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(),
}));

jest.mock('../../../../hooks/use_tracing_enabled', () => ({
  useTracingEnabled: () => false,
}));

jest.mock('../../../../hooks/use_conversation', () => ({
  useAgentId: () => undefined,
}));

jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => undefined,
}));

const copyMock = copy as jest.MockedFunction<typeof copy>;
const useToastsMock = useToasts as jest.MockedFunction<typeof useToasts>;
const addSuccessToast = jest.fn();

describe('ResponseActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copyMock.mockReturnValue(true);
    useToastsMock.mockReturnValue({ addSuccessToast } as unknown as ReturnType<typeof useToasts>);
  });

  it('labels the copy action for the agent response by default', async () => {
    render(<ResponseActions content="the answer" isVisible />);

    const copyButton = screen.getByRole('button', { name: 'Copy response' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('the answer');
    expect(addSuccessToast).toHaveBeenCalledWith('Response copied to clipboard');
  });

  it('labels the copy action for the user prompt when copyTarget is prompt', async () => {
    render(<ResponseActions content="my question" isVisible copyTarget="prompt" />);

    const copyButton = screen.getByRole('button', { name: 'Copy prompt' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('my question');
    expect(addSuccessToast).toHaveBeenCalledWith('Prompt copied to clipboard');
  });

  it('shows the execution metadata and its JSON from the terminated event', async () => {
    const terminated = createExecutionTerminatedEvent({
      data: { ...createExecutionTerminatedEvent().data, time_to_last_token: 4200 },
    });
    const steps = [{ type: ConversationRoundStepType.reasoning, reasoning: 'thinking' } as never];

    render(
      <ResponseActions
        content="the answer"
        isVisible
        executionTerminatedEvent={terminated}
        steps={steps}
      />
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });

    expect(screen.getByTestId('executionMetadataPopoverTrigger')).toHaveTextContent('4s');
    await user.click(screen.getByTestId('executionMetadataPopoverTrigger'));
    expect(screen.getByText('100')).toBeInTheDocument();

    await user.click(screen.getByTestId('executionMetadataViewJsonButton'));
    expect(screen.getByText(/"execution_id": "execution-1"/)).toBeInTheDocument();
    expect(screen.getByText(/"reasoning": "thinking"/)).toBeInTheDocument();
  });

  it('keeps copy available without regeneration', () => {
    render(<ResponseActions content="the answer" isVisible />);

    expect(screen.getByRole('button', { name: 'Copy response' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate response' })).not.toBeInTheDocument();
  });
});
