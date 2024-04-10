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
import type { SelectedPromptContext } from '../../prompt_context/types';
import { Props, SelectedPromptContexts } from '.';

const defaultProps: Props = {
  isNewConversation: false,
  promptContexts: {
    [mockAlertPromptContext.id]: mockAlertPromptContext,
    [mockEventPromptContext.id]: mockEventPromptContext,
  },
  selectedPromptContexts: {},
  setSelectedPromptContexts: jest.fn(),
};

const mockSelectedAlertPromptContext: SelectedPromptContext = {
  contextAnonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  promptContextId: mockAlertPromptContext.id,
  rawData: 'test-raw-data',
};

const mockSelectedEventPromptContext: SelectedPromptContext = {
  contextAnonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  promptContextId: mockEventPromptContext.id,
  rawData: 'test-raw-data',
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
          selectedPromptContexts={{
            [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
          }} // <-- length 1
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
          selectedPromptContexts={{
            [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
          }} // <-- length 1
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
          selectedPromptContexts={{
            [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
            [mockEventPromptContext.id]: mockSelectedEventPromptContext,
          }} // <-- length 2
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('spacer')).toHaveLength(2);
    });
  });

  it('renders the selected prompt contexts', async () => {
    const selectedPromptContexts = {
      [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
      [mockEventPromptContext.id]: mockSelectedEventPromptContext,
    };

    render(
      <TestProviders>
        <SelectedPromptContexts {...defaultProps} selectedPromptContexts={selectedPromptContexts} />
      </TestProviders>
    );

    await waitFor(() => {
      Object.keys(selectedPromptContexts).forEach((id) =>
        expect(screen.getByTestId(`selectedPromptContext-${id}`)).toBeInTheDocument()
      );
    });
  });

  it('removes a prompt context when the remove button is clicked', async () => {
    const setSelectedPromptContexts = jest.fn();
    const promptContextId = mockAlertPromptContext.id;
    const selectedPromptContexts = {
      [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
      [mockEventPromptContext.id]: mockSelectedEventPromptContext,
    };

    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          selectedPromptContexts={selectedPromptContexts}
          setSelectedPromptContexts={setSelectedPromptContexts}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId(`removePromptContext-${promptContextId}`));

    await waitFor(() => {
      expect(setSelectedPromptContexts).toHaveBeenCalled();
    });
  });

  it('displays the correct accordion content', async () => {
    render(
      <TestProviders>
        <SelectedPromptContexts
          {...defaultProps}
          selectedPromptContexts={{
            [mockAlertPromptContext.id]: mockSelectedAlertPromptContext,
          }}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByText(mockAlertPromptContext.description));

    const codeBlock = screen.getByTestId('readOnlyContextViewer');

    await waitFor(() => {
      expect(codeBlock).toHaveTextContent('CONTEXT: """ test-raw-data """');
    });
  });
});
