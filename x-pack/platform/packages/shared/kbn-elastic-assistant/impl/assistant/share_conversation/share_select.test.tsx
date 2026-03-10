/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShareSelect } from './share_select';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { welcomeConvo } from '../../mock/conversation';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';

const onUsersUpdate = jest.fn();
const onSharedSelectionChange = jest.fn();
const testProps = {
  selectedConversation: welcomeConvo,
  onUsersUpdate,
  onSharedSelectionChange,
};
jest.mock('./share_user_select', () => ({
  ShareUserSelect: () => <div data-test-subj="share_user_select">{'ShareUserSelect'}</div>,
}));
describe('ShareSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the select and options', () => {
    render(
      <TestProviders>
        <ShareSelect {...testProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('shareSelect')).toBeInTheDocument();
    expect(screen.getByLabelText(/visibility/i)).toBeInTheDocument();
  });

  it('calls onSharedSelectionChange when option is changed', async () => {
    render(
      <TestProviders>
        <ShareSelect {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareSelect'));

    await act(async () => {
      fireEvent.click(screen.getByTestId(ConversationSharedState.SHARED));
    });
    expect(onSharedSelectionChange).toHaveBeenCalledWith(ConversationSharedState.SHARED);
  });

  it('renders ShareUserSelect when Shared is selected', async () => {
    render(
      <TestProviders>
        <ShareSelect {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareSelect'));

    await act(async () => {
      fireEvent.click(screen.getByTestId(ConversationSharedState.RESTRICTED));
    });
    expect(screen.getByTestId('share_user_select')).toBeInTheDocument();
  });
});
