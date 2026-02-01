/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { FeedbackFooter } from './feedback_footer';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const mockProps = {
  isSendFeedbackButtonDisabled: false,
  submitFeedback: jest.fn(),
  hideFeedbackContainer: jest.fn(),
};

describe('FeedbackFooter', () => {
  it('should render feedback footer', () => {
    renderWithI18n(<FeedbackFooter {...mockProps} />);
    expect(screen.getByTestId('feedbackFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');

    expect(sendButton).toBeEnabled();
  });

  it('should render disabled send button when isSendFeedbackButtonDisabled is true', () => {
    renderWithI18n(<FeedbackFooter {...mockProps} isSendFeedbackButtonDisabled={true} />);
    expect(screen.getByTestId('feedbackFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');

    expect(sendButton).toBeDisabled();
  });

  it('should call submitFeedback when send button is clicked', () => {
    renderWithI18n(<FeedbackFooter {...mockProps} />);
    expect(screen.getByTestId('feedbackFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');

    fireEvent.click(sendButton);

    expect(mockProps.submitFeedback).toHaveBeenCalledTimes(1);
  });
});
