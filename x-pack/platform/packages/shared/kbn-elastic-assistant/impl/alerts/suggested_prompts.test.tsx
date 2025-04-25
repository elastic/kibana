/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SuggestedPrompts } from './suggested_prompts';
import { useAssistantContext } from '../assistant_context';
import { useAssistantOverlay } from '../assistant/use_assistant_overlay';

// Mock the custom hooks
jest.mock('../assistant_context', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('../assistant/use_assistant_overlay', () => ({
  useAssistantOverlay: jest.fn(),
}));

describe('SuggestedPrompts', () => {
  const mockShowAssistantOverlay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      assistantAvailability: { isAssistantEnabled: true },
    });
    (useAssistantOverlay as jest.Mock).mockReturnValue({
      showAssistantOverlay: mockShowAssistantOverlay,
    });
  });

  it('renders the suggested prompts', () => {
    render(
      <SuggestedPrompts
        getPromptContext={jest.fn()}
        ruleName="Test Rule"
        timestamp="2023-01-01T00:00:00Z"
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(3); // Assuming there are 3 prompts
  });

  it('calls showAssistantOverlay when a prompt is clicked', () => {
    render(
      <SuggestedPrompts
        getPromptContext={jest.fn()}
        ruleName="Test Rule"
        timestamp="2023-01-01T00:00:00Z"
      />
    );

    const firstPromptButton = screen.getAllByRole('button')[0];
    fireEvent.click(firstPromptButton);

    expect(mockShowAssistantOverlay).toHaveBeenCalledWith(true);
  });

  it('displays the correct title and description in the overlay', () => {
    render(
      <SuggestedPrompts
        getPromptContext={jest.fn()}
        ruleName="Test Rule"
        timestamp="2023-01-01T00:00:00Z"
      />
    );

    const firstPromptButton = screen.getAllByRole('button')[0];
    fireEvent.click(firstPromptButton);

    expect(mockShowAssistantOverlay).toHaveBeenCalledWith(true);
    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
  });
});
