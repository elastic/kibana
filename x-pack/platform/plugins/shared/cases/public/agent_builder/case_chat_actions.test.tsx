/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../common/mock';
import { basicCase } from '../containers/mock';
import { useAddCaseToChat } from './use_add_case_to_chat';
import { CaseChatActions } from './case_chat_actions';

jest.mock('./use_add_case_to_chat');

const useAddCaseToChatMock = useAddCaseToChat as jest.Mock;

describe('CaseChatActions', () => {
  const addToChat = jest.fn();
  const summarizeCase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAddCaseToChatMock.mockReturnValue({
      addToChat,
      summarizeCase,
      isAddToChatAvailable: true,
    });
  });

  it('does not render when add to chat is unavailable', () => {
    useAddCaseToChatMock.mockReturnValue({
      addToChat,
      summarizeCase,
      isAddToChatAvailable: false,
    });

    renderWithTestingProviders(<CaseChatActions caseData={basicCase} />);

    expect(screen.queryByTestId('case-chat-actions')).not.toBeInTheDocument();
  });

  it('adds the case to chat from the dropdown', async () => {
    renderWithTestingProviders(<CaseChatActions caseData={basicCase} />);

    await userEvent.click(screen.getByTestId('case-chat-actions'));
    fireEvent.click(screen.getByTestId('case-chat-action-add-to-chat'));

    expect(addToChat).toHaveBeenCalled();
  });

  it('shows only add to chat and summarize case in the dropdown', async () => {
    renderWithTestingProviders(<CaseChatActions caseData={basicCase} />);

    await userEvent.click(screen.getByTestId('case-chat-actions'));

    expect(screen.getByTestId('case-chat-action-add-to-chat')).toBeInTheDocument();
    expect(screen.getByTestId('case-chat-action-summarize')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('summarizes the case from the dropdown', async () => {
    renderWithTestingProviders(<CaseChatActions caseData={basicCase} />);

    await userEvent.click(screen.getByTestId('case-chat-actions'));
    fireEvent.click(screen.getByTestId('case-chat-action-summarize'));

    expect(summarizeCase).toHaveBeenCalled();
  });
});
