/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { AddToChatButton } from './add_to_chat_button';
import { useManualAddToChat } from './use_manual_add_to_chat';
import type { AttachmentConverter } from './auto_attach';

jest.mock('./use_manual_add_to_chat');

const mockUseManualAddToChat = jest.mocked(useManualAddToChat);

interface TestItem {
  id: string;
}

const converter: AttachmentConverter<TestItem> = {
  toAttachment: (item) => ({
    id: `test:${item.id}`,
    type: 'test-attachment',
    origin: item.id,
    data: { id: item.id },
  }),
  getOrigin: (item) => item.id,
};

describe('AddToChatButton', () => {
  const addToChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseManualAddToChat.mockReturnValue({
      addToChat,
      isAddToChatAvailable: true,
    });
  });

  it('renders the add to chat button when available', () => {
    render(
      <I18nProvider>
        <AddToChatButton item={{ id: 'item-1' }} converter={converter} />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2AddToChatButton')).toHaveTextContent('Add to chat');
  });

  it('does not render when add to chat is unavailable', () => {
    mockUseManualAddToChat.mockReturnValue({
      addToChat,
      isAddToChatAvailable: false,
    });

    const { container } = render(
      <I18nProvider>
        <AddToChatButton item={{ id: 'item-1' }} converter={converter} />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls addToChat on click', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <AddToChatButton item={{ id: 'item-1' }} converter={converter} />
      </I18nProvider>
    );

    await user.click(screen.getByTestId('alertingV2AddToChatButton'));

    expect(addToChat).toHaveBeenCalledTimes(1);
  });
});
