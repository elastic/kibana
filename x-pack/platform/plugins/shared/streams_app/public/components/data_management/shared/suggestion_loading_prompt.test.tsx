/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionLoadingPrompt } from './suggestion_loading_prompt';

describe('SuggestionLoadingPrompt', () => {
  it('renders the loading prompt with skeleton text', () => {
    render(<SuggestionLoadingPrompt />);

    expect(screen.getByText('Analyzing your data...')).toBeInTheDocument();
    expect(screen.getByTestId('streamsAppPipelineSuggestionLoadingPrompt')).toBeInTheDocument();
  });

  it('shows background message by default', () => {
    render(<SuggestionLoadingPrompt />);

    expect(
      screen.getByText(
        "You don't need to stay on this page. The suggestion will be available when you return."
      )
    ).toBeInTheDocument();
  });

  it('shows background message when showBackgroundMessage is true', () => {
    render(<SuggestionLoadingPrompt showBackgroundMessage={true} />);

    expect(
      screen.getByText(
        "You don't need to stay on this page. The suggestion will be available when you return."
      )
    ).toBeInTheDocument();
  });

  it('hides background message when showBackgroundMessage is false', () => {
    render(<SuggestionLoadingPrompt showBackgroundMessage={false} />);

    expect(
      screen.queryByText(
        "You don't need to stay on this page. The suggestion will be available when you return."
      )
    ).not.toBeInTheDocument();
  });

  it('renders cancel button when onCancel is provided', () => {
    const onCancel = jest.fn();
    render(<SuggestionLoadingPrompt onCancel={onCancel} />);

    const cancelButton = screen.getByTestId('streamsAppPipelineSuggestionCancelButton');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<SuggestionLoadingPrompt onCancel={onCancel} />);

    const cancelButton = screen.getByTestId('streamsAppPipelineSuggestionCancelButton');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(<SuggestionLoadingPrompt />);

    expect(
      screen.queryByTestId('streamsAppPipelineSuggestionCancelButton')
    ).not.toBeInTheDocument();
  });

  it('hides background message but shows cancel button', () => {
    const onCancel = jest.fn();
    render(<SuggestionLoadingPrompt showBackgroundMessage={false} onCancel={onCancel} />);

    expect(
      screen.queryByText(
        "You don't need to stay on this page. The suggestion will be available when you return."
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsAppPipelineSuggestionCancelButton')).toBeInTheDocument();
  });
});
