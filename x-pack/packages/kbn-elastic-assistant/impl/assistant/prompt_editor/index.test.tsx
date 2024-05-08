/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { mockAlertPromptContext, mockEventPromptContext } from '../../mock/prompt_context';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { SelectedPromptContext } from '../prompt_context/types';
import { PromptEditor, Props } from '.';

const mockSelectedAlertPromptContext: SelectedPromptContext = {
  contextAnonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  promptContextId: mockAlertPromptContext.id,
  rawData: 'alert data',
};

const mockSelectedEventPromptContext: SelectedPromptContext = {
  contextAnonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  promptContextId: mockEventPromptContext.id,
  rawData: 'event data',
};

const defaultProps: Props = {
  conversation: undefined,
  editingSystemPromptId: undefined,
  isNewConversation: true,
  isSettingsModalVisible: false,
  onSystemPromptSelectionChange: jest.fn(),
  promptContexts: {
    [mockAlertPromptContext.id]: mockAlertPromptContext,
    [mockEventPromptContext.id]: mockEventPromptContext,
  },
  promptTextPreview: 'Preview text',
  selectedPromptContexts: {},
  setIsSettingsModalVisible: jest.fn(),
  setSelectedPromptContexts: jest.fn(),
};

describe('PromptEditorComponent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the system prompt selector when isNewConversation is true', async () => {
    render(
      <TestProviders>
        <PromptEditor {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });
  });

  it('does NOT render the system prompt selector when isNewConversation is false', async () => {
    render(
      <TestProviders>
        <PromptEditor {...defaultProps} isNewConversation={false} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('selectSystemPrompt')).not.toBeInTheDocument();
    });
  });

  it('renders the selected prompt contexts', async () => {
    const selectedPromptContexts = {
      [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
      [mockEventPromptContext.id]: mockSelectedEventPromptContext,
    };

    render(
      <TestProviders>
        <PromptEditor {...defaultProps} selectedPromptContexts={selectedPromptContexts} />
      </TestProviders>
    );

    await waitFor(() => {
      Object.keys(selectedPromptContexts).forEach((id) =>
        expect(screen.queryByTestId(`selectedPromptContext-${id}`)).toBeInTheDocument()
      );
    });
  });

  it('renders the expected preview text', async () => {
    render(
      <TestProviders>
        <PromptEditor {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('previewText')).toHaveTextContent('Preview text');
    });
  });

  it('renders an "editing prompt" `EuiComment` event', async () => {
    render(
      <TestProviders>
        <PromptEditor {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('eventText')).toHaveTextContent('editing prompt');
    });
  });

  it('renders the user avatar', async () => {
    render(
      <TestProviders>
        <PromptEditor {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('userAvatar')).toBeInTheDocument();
    });
  });
});
