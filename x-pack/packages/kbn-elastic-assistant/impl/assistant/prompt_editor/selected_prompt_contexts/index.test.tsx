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
  promptContexts: {
    [mockAlertPromptContext.id]: mockAlertPromptContext,
    [mockEventPromptContext.id]: mockEventPromptContext,
  },
  selectedPromptContexts: {},
  setSelectedPromptContexts: jest.fn(),
  currentReplacements: {},
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
