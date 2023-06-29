/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockSystemPrompt, mockSuperheroSystemPrompt } from '../../../mock/system_prompt';
import { SystemPrompt } from '.';

describe('SystemPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when selectedSystemPromptId is null', () => {
    const selectedSystemPromptId = null;

    beforeEach(() => {
      render(
        <SystemPrompt
          selectedSystemPromptId={selectedSystemPromptId}
          setSelectedSystemPromptId={jest.fn()}
          systemPrompts={[mockSystemPrompt]}
        />
      );
    });

    it('renders the system prompt select', () => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('does NOT render the system prompt text', () => {
      expect(screen.queryByTestId('systemPromptText')).not.toBeInTheDocument();
    });

    it('does NOT render the edit button', () => {
      expect(screen.queryByTestId('edit')).not.toBeInTheDocument();
    });

    it('does NOT render the clear button', () => {
      expect(screen.queryByTestId('clear')).not.toBeInTheDocument();
    });
  });

  describe('when selectedSystemPromptId is NOT null', () => {
    const selectedSystemPromptId = mockSystemPrompt.id;

    beforeEach(() => {
      render(
        <SystemPrompt
          selectedSystemPromptId={selectedSystemPromptId}
          setSelectedSystemPromptId={jest.fn()}
          systemPrompts={[mockSystemPrompt]}
        />
      );
    });

    it('does NOT render the system prompt select', () => {
      expect(screen.queryByTestId('selectSystemPrompt')).not.toBeInTheDocument();
    });

    it('renders the system prompt text', () => {
      expect(screen.getByTestId('systemPromptText')).toHaveTextContent(mockSystemPrompt.content);
    });

    it('renders the edit button', () => {
      expect(screen.getByTestId('edit')).toBeInTheDocument();
    });

    it('renders the clear button', () => {
      expect(screen.getByTestId('clear')).toBeInTheDocument();
    });
  });

  it('shows the system prompt select when the edit button is clicked', () => {
    render(
      <SystemPrompt
        selectedSystemPromptId={mockSystemPrompt.id}
        setSelectedSystemPromptId={jest.fn()}
        systemPrompts={[mockSystemPrompt, mockSuperheroSystemPrompt]}
      />
    );

    userEvent.click(screen.getByTestId('edit'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', () => {
    const setSelectedSystemPromptId = jest.fn();

    render(
      <SystemPrompt
        selectedSystemPromptId={mockSystemPrompt.id}
        setSelectedSystemPromptId={setSelectedSystemPromptId}
        systemPrompts={[mockSystemPrompt, mockSuperheroSystemPrompt]}
      />
    );

    userEvent.click(screen.getByTestId('clear'));

    expect(setSelectedSystemPromptId).toHaveBeenCalledWith(null);
  });

  it('shows the system prompt select when system prompt text is clicked', () => {
    render(
      <SystemPrompt
        selectedSystemPromptId={mockSystemPrompt.id}
        setSelectedSystemPromptId={jest.fn()}
        systemPrompts={[mockSystemPrompt, mockSuperheroSystemPrompt]}
      />
    );

    fireEvent.click(screen.getByTestId('systemPromptText'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });
});
