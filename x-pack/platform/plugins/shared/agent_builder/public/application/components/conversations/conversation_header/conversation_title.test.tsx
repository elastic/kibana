/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConversationPermissions } from '../../../../../common/http_api/conversations';
import {
  useConversationPermissions,
  useConversationTitle,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { ConversationTitle } from './conversation_title';

jest.mock('../../../hooks/use_conversation', () => ({
  useConversationTitle: jest.fn(),
  useHasPersistedConversation: jest.fn(),
  useConversationPermissions: jest.fn(),
}));

jest.mock('../rename_conversation_modal', () => ({
  RenameConversationModal: () => null,
}));

jest.mock('../delete_conversation_modal', () => ({
  DeleteConversationModal: () => null,
}));

const mockUseConversationTitle = jest.mocked(useConversationTitle);
const mockUseHasPersistedConversation = jest.mocked(useHasPersistedConversation);
const mockUseConversationPermissions = jest.mocked(useConversationPermissions);

const renderTitle = (permissions: ConversationPermissions) => {
  mockUseConversationTitle.mockReturnValue({ title: 'My conversation', isLoading: false });
  mockUseHasPersistedConversation.mockReturnValue(true);
  mockUseConversationPermissions.mockReturnValue(permissions);

  render(
    <IntlProvider locale="en">
      <ConversationTitle />
    </IntlProvider>
  );

  fireEvent.click(screen.getByTestId('agentBuilderConversationTitleButton'));
};

describe('ConversationTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables rename and delete for the conversation owner', () => {
    renderTitle({ rename_conversation: true, delete_conversation: true });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeEnabled();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeEnabled();
  });

  it('disables rename and delete when the user is not the owner', () => {
    renderTitle({ rename_conversation: false, delete_conversation: false });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeDisabled();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeDisabled();
  });

  it('explains why rename and delete are unavailable', async () => {
    renderTitle({ rename_conversation: false, delete_conversation: false });

    fireEvent.mouseOver(screen.getByTestId('agentBuilderConversationRenameButton'));

    expect(
      await screen.findByText('Only the conversation owner can rename it.')
    ).toBeInTheDocument();
  });

  it('gates rename and delete independently', () => {
    renderTitle({ rename_conversation: true, delete_conversation: false });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeEnabled();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeDisabled();
  });
});
