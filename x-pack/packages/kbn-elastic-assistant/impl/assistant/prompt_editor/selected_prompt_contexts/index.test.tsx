/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockAlertPromptContext, mockEventPromptContext } from '../../../mock/prompt_context';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { Props, SelectedPromptContexts } from '.';

const defaultProps: Props = {
  isNewConversation: false,
  promptContexts: {
    [mockAlertPromptContext.id]: mockAlertPromptContext,
    [mockEventPromptContext.id]: mockEventPromptContext,
  },
  selectedPromptContextIds: [],
  setSelectedPromptContextIds: jest.fn(),
};

describe('SelectedPromptContexts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('it does NOT render the selected prompt contexts when promptContexts is empty', async () => {
    render(
      <TestProviders>
        <SelectedPromptContexts {...defaultProps} promptContexts={{}} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('selectedPromptContexts')).not.toBeInTheDocument();
    });
  });

  it('it does NOT render a spacer when isNewConversation is false and selectedPromptContextIds.length is 1', async () => {
    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          isNewConversation={false} // <--
          selectedPromptContextIds={[mockAlertPromptContext.id]} // <-- length 1
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spacer')).not.toBeInTheDocument();
    });
  });

  it('it renders a spacer when isNewConversation is true and selectedPromptContextIds.length is 1', async () => {
    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          isNewConversation={true} // <--
          selectedPromptContextIds={[mockAlertPromptContext.id]} // <-- length 1
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('spacer')).toBeInTheDocument();
    });
  });

  it('it renders a spacer for each selected prompt context when isNewConversation is false and selectedPromptContextIds.length is 2', async () => {
    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          isNewConversation={false} // <--
          selectedPromptContextIds={[mockAlertPromptContext.id, mockEventPromptContext.id]} // <-- length 2
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('spacer')).toHaveLength(2);
    });
  });

  it('renders the selected prompt contexts', async () => {
    const selectedPromptContextIds = [mockAlertPromptContext.id, mockEventPromptContext.id];

    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          selectedPromptContextIds={selectedPromptContextIds}
        />
      </TestProviders>
    );

    await waitFor(() => {
      selectedPromptContextIds.forEach((id) =>
        expect(screen.getByTestId(`selectedPromptContext-${id}`)).toBeInTheDocument()
      );
    });
  });

  it('removes a prompt context when the remove button is clicked', async () => {
    const setSelectedPromptContextIds = jest.fn();
    const promptContextId = mockAlertPromptContext.id;

    render(
      <SelectedPromptContexts
        {...defaultProps}
        selectedPromptContextIds={[promptContextId, mockEventPromptContext.id]}
        setSelectedPromptContextIds={setSelectedPromptContextIds}
      />
    );

    userEvent.click(screen.getByTestId(`removePromptContext-${promptContextId}`));

    await waitFor(() => {
      expect(setSelectedPromptContextIds).toHaveBeenCalled();
    });
  });

  it('displays the correct accordion content', async () => {
    render(
      <SelectedPromptContexts
        {...defaultProps}
        selectedPromptContextIds={[mockAlertPromptContext.id]}
      />
    );

    userEvent.click(screen.getByText(mockAlertPromptContext.description));

    const codeBlock = screen.getByTestId('promptCodeBlock');

    await waitFor(() => {
      expect(codeBlock).toHaveTextContent('alert data');
    });
  });
});
