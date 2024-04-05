/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../mock/test_providers/test_providers';
import type { PromptContext, SelectedPromptContext } from '../prompt_context/types';
import { ContextPills } from '.';

const mockPromptContexts: Record<string, PromptContext> = {
  context1: {
    category: 'alert',
    description: 'Context 1',
    getPromptContext: () => Promise.resolve('Context 1 data'),
    id: 'context1',
    tooltip: 'Context 1 tooltip',
  },
  context2: {
    category: 'event',
    description: 'Context 2',
    getPromptContext: () => Promise.resolve('Context 2 data'),
    id: 'context2',
    tooltip: 'Context 2 tooltip',
  },
};

const defaultProps = {
  anonymizationFields: { total: 0, page: 1, perPage: 100, data: [] },
  promptContexts: mockPromptContexts,
};

describe('ContextPills', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the context pill descriptions', () => {
    render(
      <TestProviders>
        <ContextPills
          {...defaultProps}
          selectedPromptContexts={{}}
          setSelectedPromptContexts={jest.fn()}
        />
      </TestProviders>
    );

    Object.values(mockPromptContexts).forEach(({ id, description }) => {
      expect(screen.getByTestId(`pillButton-${id}`)).toHaveTextContent(description);
    });
  });

  it('invokes setSelectedPromptContexts() when the prompt is NOT already selected', async () => {
    const context = mockPromptContexts.context1;
    const setSelectedPromptContexts = jest.fn();

    render(
      <TestProviders>
        <ContextPills
          {...defaultProps}
          selectedPromptContexts={{}} // <-- the prompt is NOT selected
          setSelectedPromptContexts={setSelectedPromptContexts}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId(`pillButton-${context.id}`));

    await waitFor(() => {
      expect(setSelectedPromptContexts).toBeCalled();
    });
  });

  it('it does NOT invoke setSelectedPromptContexts() when the prompt is already selected', async () => {
    const context = mockPromptContexts.context1;
    const mockSelectedPromptContext: SelectedPromptContext = {
      contextAnonymizationFields: { total: 0, page: 1, perPage: 100, data: [] },
      promptContextId: context.id,
      rawData: 'test-raw-data',
    };
    const setSelectedPromptContexts = jest.fn();

    render(
      <TestProviders>
        <ContextPills
          {...defaultProps}
          selectedPromptContexts={{
            [context.id]: mockSelectedPromptContext,
          }} // <-- the context is already selected
          setSelectedPromptContexts={setSelectedPromptContexts}
        />
      </TestProviders>
    );

    // NOTE: this test uses `fireEvent` instead of `userEvent` to bypass the disabled button:
    fireEvent.click(screen.getByTestId(`pillButton-${context.id}`));

    await waitFor(() => {
      expect(setSelectedPromptContexts).not.toBeCalled();
    });
  });

  it('disables selected context pills', () => {
    const context = mockPromptContexts.context1;
    const mockSelectedPromptContext: SelectedPromptContext = {
      contextAnonymizationFields: { total: 0, page: 1, perPage: 100, data: [] },
      promptContextId: context.id,
      rawData: 'test-raw-data',
    };

    render(
      <TestProviders>
        <ContextPills
          {...defaultProps}
          selectedPromptContexts={{
            [context.id]: mockSelectedPromptContext,
          }} // <-- the context is selected
          setSelectedPromptContexts={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId(`pillButton-${context.id}`)).toBeDisabled();
  });

  it("does NOT disable context pills that aren't selected", () => {
    const context = mockPromptContexts.context1;

    render(
      <TestProviders>
        <ContextPills
          {...defaultProps}
          selectedPromptContexts={{}} // context1 is NOT selected
          setSelectedPromptContexts={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId(`pillButton-${context.id}`)).not.toBeDisabled();
  });
});
