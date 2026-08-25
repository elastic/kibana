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
import { RoundResponseActions } from './round_response_actions';
import { useToasts } from '../../../../hooks/use_toasts';

jest.mock('copy-to-clipboard');

jest.mock('../../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({
    regenerate: jest.fn(),
    isRegenerating: false,
    isResponseLoading: false,
  }),
}));

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { plugins: {} } }),
}));

jest.mock('../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => false,
}));

jest.mock('../../../../hooks/use_tracing_enabled', () => ({
  useTracingEnabled: () => false,
}));

const copyMock = copy as jest.MockedFunction<typeof copy>;
const useToastsMock = useToasts as jest.MockedFunction<typeof useToasts>;
const addSuccessToast = jest.fn();

describe('RoundResponseActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copyMock.mockReturnValue(true);
    useToastsMock.mockReturnValue({ addSuccessToast } as unknown as ReturnType<typeof useToasts>);
  });

  it('labels the copy action for the agent response by default', async () => {
    render(<RoundResponseActions content="the answer" isVisible />);

    const copyButton = screen.getByRole('button', { name: 'Copy response' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('the answer');
    expect(addSuccessToast).toHaveBeenCalledWith('Response copied to clipboard');
  });

  it('labels the copy action for the user prompt when copyTarget is prompt', async () => {
    render(<RoundResponseActions content="my question" isVisible copyTarget="prompt" />);

    const copyButton = screen.getByRole('button', { name: 'Copy prompt' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('my question');
    expect(addSuccessToast).toHaveBeenCalledWith('Prompt copied to clipboard');
  });
});
