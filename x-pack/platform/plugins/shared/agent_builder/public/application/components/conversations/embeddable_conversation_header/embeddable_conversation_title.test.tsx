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
import { EmbeddableConversationTitle } from './embeddable_conversation_title';

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

const renderTitle = (permissions: Partial<ConversationPermissions>) => {
  mockUseConversationTitle.mockReturnValue({ title: 'My conversation', isLoading: false });
  mockUseHasPersistedConversation.mockReturnValue(true);
  mockUseConversationPermissions.mockReturnValue({
    rename: false,
    delete: false,
    update_access_control: false,
    ...permissions,
  });

  render(
    <IntlProvider locale="en">
      <EmbeddableConversationTitle />
    </IntlProvider>
  );
};

const openTitleMenu = () =>
  fireEvent.click(screen.getByTestId('agentBuilderConversationTitleButton'));

describe('EmbeddableConversationTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers rename and delete when both are permitted', () => {
    renderTitle({ rename: true, delete: true });
    openTitleMenu();

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeInTheDocument();
  });

  it('offers only the permitted action', () => {
    renderTitle({ rename: true, delete: false });
    openTitleMenu();

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderConversationDeleteButton')).not.toBeInTheDocument();
  });

  // The menu holds nothing else, so an empty popover would be a dead end.
  it('renders a plain title with no menu when neither action is permitted', () => {
    renderTitle({ rename: false, delete: false });

    expect(screen.queryByTestId('agentBuilderConversationTitleButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationTitle')).toHaveTextContent(
      'My conversation'
    );
  });
});
