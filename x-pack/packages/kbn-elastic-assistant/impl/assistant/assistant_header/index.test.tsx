/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantHeader } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { alertConvo, emptyWelcomeConvo } from '../../mock/conversation';

const testProps = {
  currentConversation: emptyWelcomeConvo,
  currentTitle: {
    title: 'Test Title',
    titleIcon: 'logoSecurity',
  },
  docLinks: {
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    DOC_LINK_VERSION: 'master',
  },
  isDisabled: false,
  isSettingsModalVisible: false,
  onConversationSelected: jest.fn(),
  onToggleShowAnonymizedValues: jest.fn(),
  selectedConversationId: emptyWelcomeConvo.id,
  setIsSettingsModalVisible: jest.fn(),
  setSelectedConversationId: jest.fn(),
  showAnonymizedValues: false,
};

describe('AssistantHeader', () => {
  it('showAnonymizedValues is not checked when currentConversation.replacements is null', () => {
    const { getByText, getByTestId } = render(<AssistantHeader {...testProps} />, {
      wrapper: TestProviders,
    });
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is not checked when currentConversation.replacements is empty', () => {
    const { getByText, getByTestId } = render(
      <AssistantHeader
        {...testProps}
        currentConversation={{ ...emptyWelcomeConvo, replacements: {} }}
      />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is not checked when currentConversation.replacements has values and showAnonymizedValues is false', () => {
    const { getByTestId } = render(
      <AssistantHeader
        {...testProps}
        currentConversation={alertConvo}
        selectedConversationId={alertConvo.id}
      />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is checked when currentConversation.replacements has values and showAnonymizedValues is true', () => {
    const { getByTestId } = render(
      <AssistantHeader
        {...testProps}
        currentConversation={alertConvo}
        selectedConversationId={alertConvo.id}
        showAnonymizedValues
      />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'true');
  });
});
