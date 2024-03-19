/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useConnectorSetup } from '.';
import { act, renderHook } from '@testing-library/react-hooks';
import { fireEvent, render } from '@testing-library/react';
import { welcomeConvo } from '../../mock/conversation';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { EuiCommentList } from '@elastic/eui';

const onSetupComplete = jest.fn();
const onConversationUpdate = jest.fn();

const defaultProps = {
  conversation: welcomeConvo,
  onSetupComplete,
  onConversationUpdate,
};
const newConnector = { actionTypeId: '.gen-ai', name: 'cool name' };
jest.mock('../add_connector_modal', () => ({
  // @ts-ignore
  AddConnectorModal: ({ onSaveConnector }) => (
    <>
      <button
        type="button"
        data-test-subj="modal-mock"
        onClick={() => onSaveConnector(newConnector)}
      />
    </>
  ),
}));

const setApiConfig = jest.fn().mockResolvedValue(welcomeConvo);
const mockConversation = {
  appendMessage: jest.fn(),
  appendReplacements: jest.fn(),
  clearConversation: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  setApiConfig,
};

jest.mock('../../assistant/use_conversation', () => ({
  useConversation: () => mockConversation,
}));

jest.spyOn(global, 'clearTimeout');
describe('useConnectorSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render comments and prompts', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectorSetup(defaultProps), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(
        result.current.comments.map((c) => ({ username: c.username, timestamp: c.timestamp }))
      ).toEqual([
        {
          username: 'You',
          timestamp: `at: ${new Date('2024-03-18T18:59:18.174Z').toLocaleString()}`,
        },
        {
          username: 'Assistant',
          timestamp: `at: ${new Date('2024-03-19T18:59:18.174Z').toLocaleString()}`,
        },
      ]);

      expect(result.current.prompt.props['data-test-subj']).toEqual('prompt');
    });
  });
  it('should set api config for each conversation when new connector is saved', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectorSetup(defaultProps), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      const { getByTestId, queryByTestId, rerender } = render(result.current.prompt, {
        wrapper: TestProviders,
      });
      expect(getByTestId('connectorButton')).toBeInTheDocument();
      expect(queryByTestId('skip-setup-button')).not.toBeInTheDocument();
      fireEvent.click(getByTestId('connectorButton'));

      rerender(result.current.prompt);
      fireEvent.click(getByTestId('modal-mock'));
      expect(setApiConfig).toHaveBeenCalledTimes(1);
    });
  });

  it('should show skip button if message has presentation data', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () =>
          useConnectorSetup({
            ...defaultProps,
            conversation: {
              ...defaultProps.conversation,
              messages: [
                {
                  ...defaultProps.conversation.messages[0],
                  presentation: {
                    delay: 0,
                    stream: false,
                  },
                },
              ],
            },
          }),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const { getByTestId, queryByTestId } = render(result.current.prompt, {
        wrapper: TestProviders,
      });
      expect(getByTestId('skip-setup-button')).toBeInTheDocument();
      expect(queryByTestId('connectorButton')).not.toBeInTheDocument();
    });
  });
  it('should call onSetupComplete and setConversations when onHandleMessageStreamingComplete', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectorSetup(defaultProps), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      render(<EuiCommentList comments={result.current.comments} />, {
        wrapper: TestProviders,
      });

      expect(clearTimeout).toHaveBeenCalled();
      expect(onSetupComplete).toHaveBeenCalled();
    });
  });
});
