/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../mock/test_providers/test_providers';
import type { PromptContext } from '../prompt_context/types';
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

describe('ContextPills', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the context pill descriptions', () => {
    render(
      <TestProviders>
        <ContextPills
          promptContexts={mockPromptContexts}
          selectedPromptContextIds={[]}
          setSelectedPromptContextIds={jest.fn()}
        />
      </TestProviders>
    );

    Object.values(mockPromptContexts).forEach(({ id, description }) => {
      expect(screen.getByTestId(`pillButton-${id}`)).toHaveTextContent(description);
    });
  });

  it('invokes setSelectedPromptContextIds() when the prompt is NOT already selected', () => {
    const context = mockPromptContexts.context1;
    const setSelectedPromptContextIds = jest.fn();

    render(
      <TestProviders>
        <ContextPills
          promptContexts={mockPromptContexts}
          selectedPromptContextIds={[]} // <-- the prompt is NOT selected
          setSelectedPromptContextIds={setSelectedPromptContextIds}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId(`pillButton-${context.id}`));

    expect(setSelectedPromptContextIds).toBeCalled();
  });

  it('it does NOT invoke setSelectedPromptContextIds() when the prompt is already selected', () => {
    const context = mockPromptContexts.context1;
    const setSelectedPromptContextIds = jest.fn();

    render(
      <TestProviders>
        <ContextPills
          promptContexts={mockPromptContexts}
          selectedPromptContextIds={[context.id]} // <-- the context is already selected
          setSelectedPromptContextIds={setSelectedPromptContextIds}
        />
      </TestProviders>
    );

    // NOTE: this test uses `fireEvent` instead of `userEvent` to bypass the disabled button:
    fireEvent.click(screen.getByTestId(`pillButton-${context.id}`));

    expect(setSelectedPromptContextIds).not.toBeCalled();
  });

  it('disables selected context pills', () => {
    const context = mockPromptContexts.context1;

    render(
      <TestProviders>
        <ContextPills
          promptContexts={mockPromptContexts}
          selectedPromptContextIds={[context.id]} // <-- context1 is selected
          setSelectedPromptContextIds={jest.fn()}
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
          promptContexts={mockPromptContexts}
          selectedPromptContextIds={['context2']} // context1 is NOT selected
          setSelectedPromptContextIds={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId(`pillButton-${context.id}`)).not.toBeDisabled();
  });
});
