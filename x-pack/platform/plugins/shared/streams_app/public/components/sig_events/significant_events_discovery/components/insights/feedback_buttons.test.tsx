/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FeedbackButtons } from './feedback_buttons';

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('FeedbackButtons', () => {
  let onFeedback: jest.Mock;

  beforeEach(() => {
    onFeedback = jest.fn();
  });

  it('renders the feedback prompt and both buttons', () => {
    renderWithProviders(<FeedbackButtons onFeedback={onFeedback} />);

    expect(screen.getByText('Share your feedback:')).toBeInTheDocument();
    expect(screen.getByTestId('significant_events_summary_helpful_button')).toBeInTheDocument();
    expect(screen.getByTestId('significant_events_summary_not_helpful_button')).toBeInTheDocument();
  });

  it('calls onFeedback with "helpful" when thumbs up is clicked', () => {
    renderWithProviders(<FeedbackButtons onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTestId('significant_events_summary_helpful_button'));

    expect(onFeedback).toHaveBeenCalledWith('helpful');
    expect(onFeedback).toHaveBeenCalledTimes(1);
  });

  it('calls onFeedback with "not_helpful" when thumbs down is clicked', () => {
    renderWithProviders(<FeedbackButtons onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTestId('significant_events_summary_not_helpful_button'));

    expect(onFeedback).toHaveBeenCalledWith('not_helpful');
    expect(onFeedback).toHaveBeenCalledTimes(1);
  });

  it('hides buttons and shows confirmation after clicking thumbs up', () => {
    renderWithProviders(<FeedbackButtons onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTestId('significant_events_summary_helpful_button'));

    expect(screen.getByText('Thank you!')).toBeInTheDocument();
    expect(
      screen.queryByTestId('significant_events_summary_helpful_button')
    ).not.toBeInTheDocument();
  });

  it('hides buttons and shows confirmation after clicking thumbs down', () => {
    renderWithProviders(<FeedbackButtons onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTestId('significant_events_summary_not_helpful_button'));

    expect(screen.getByText('Thank you!')).toBeInTheDocument();
    expect(
      screen.queryByTestId('significant_events_summary_not_helpful_button')
    ).not.toBeInTheDocument();
  });
});
