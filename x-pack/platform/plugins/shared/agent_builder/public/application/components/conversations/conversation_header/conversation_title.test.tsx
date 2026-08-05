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

/**
 * Mirrors EUI's `focusEuiToolTipTrigger` test helper, which its type declarations do not export
 * yet: plain `fireEvent.focus` does not set `:focus-visible` in jsdom, so the tooltip never shows.
 *
 * Delete once https://github.com/elastic/eui/pull/9870 ships and Kibana picks up that EUI release,
 * then import it from `@elastic/eui/lib/test/rtl`.
 */
const focusEuiToolTipTrigger = (element: HTMLElement) => {
  const spy = jest
    .spyOn(element, 'matches')
    .mockImplementation((selector) => selector === ':focus-visible');
  fireEvent.focus(element);
  return () => spy.mockRestore();
};

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

  it('enables rename and delete when both are permitted', () => {
    renderTitle({ rename: true, delete: true });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeEnabled();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeEnabled();
  });

  // Denied items are disabled via `aria-disabled` (`hasAriaDisabled`), which keeps them focusable
  // so the tooltip explaining the denial remains reachable — see `AriaDisabledContextMenuItem`.
  it('disables rename and delete when neither is permitted', () => {
    renderTitle({ rename: false, delete: false });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('explains why rename and delete are unavailable', async () => {
    renderTitle({ rename: false, delete: false });

    const cleanup = focusEuiToolTipTrigger(
      screen.getByTestId('agentBuilderConversationRenameButton')
    );

    expect(
      await screen.findByText('You do not have permission to rename this conversation.')
    ).toBeInTheDocument();

    cleanup();
  });

  it('gates rename and delete independently', () => {
    renderTitle({ rename: true, delete: false });

    expect(screen.getByTestId('agentBuilderConversationRenameButton')).toBeEnabled();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});
