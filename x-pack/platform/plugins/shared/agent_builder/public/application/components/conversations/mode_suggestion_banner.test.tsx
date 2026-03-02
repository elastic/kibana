/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModeSuggestionBanner } from './mode_suggestion_banner';

describe('ModeSuggestionBanner', () => {
  const defaultProps = {
    reason: 'This task involves multiple steps that would benefit from upfront planning.',
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the suggestion reason', () => {
    render(<ModeSuggestionBanner {...defaultProps} />);
    expect(
      screen.getByText(
        'This task involves multiple steps that would benefit from upfront planning.'
      )
    ).toBeInTheDocument();
  });

  it('renders the accept button', () => {
    render(<ModeSuggestionBanner {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderModeSuggestionAccept')).toBeInTheDocument();
  });

  it('renders the dismiss button', () => {
    render(<ModeSuggestionBanner {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderModeSuggestionDismiss')).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    render(<ModeSuggestionBanner {...defaultProps} />);
    fireEvent.click(screen.getByTestId('agentBuilderModeSuggestionAccept'));
    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<ModeSuggestionBanner {...defaultProps} />);
    fireEvent.click(screen.getByTestId('agentBuilderModeSuggestionDismiss'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});
