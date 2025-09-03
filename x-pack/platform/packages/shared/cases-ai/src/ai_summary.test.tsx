/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AISummaryProps } from './ai_summary';
import { AISummary } from './ai_summary';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import moment from 'moment';

const defaultProps: AISummaryProps = {
  title: 'AI summary',
  summary: {
    content: 'AI generated summary.',
    generatedAt: '2025-08-26T12:00:00Z',
  },
  isOpen: false,
  onToggle: jest.fn(),
  error: null,
  loading: false,
};

describe('AI Summary', () => {
  const renderComponent = (props: AISummaryProps) =>
    render(
      <IntlProvider locale="en">
        <AISummary {...props} />
      </IntlProvider>
    );

  it('renders the title', () => {
    renderComponent({ ...defaultProps });
    expect(screen.getByText('AI summary')).toBeInTheDocument();
  });

  it('renders summary content when open', () => {
    renderComponent({ ...defaultProps, isOpen: true });
    expect(screen.getByText('AI generated summary.')).toBeInTheDocument();
  });

  it('shows generated date and time when open and summary exists', () => {
    renderComponent({ ...defaultProps, isOpen: true });

    const localDate = moment(defaultProps.summary?.generatedAt).format('MMM DD, yyyy');
    const localTime = moment(defaultProps.summary?.generatedAt).format('HH:mm');

    expect(screen.getByText(/Generated on/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(localDate))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(localTime))).toBeInTheDocument();
  });

  it('calls onToggle when accordion is toggled', () => {
    renderComponent({ ...defaultProps });
    const accordionButton = screen.getByTestId('aiSummaryButton');
    fireEvent.click(accordionButton);
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('shows error when error is present', () => {
    renderComponent({
      ...defaultProps,
      summary: undefined,
      isOpen: true,
      error: new Error('Something went wrong'),
    });
    expect(screen.getByText('Error fetching AI summary')).toBeInTheDocument();
  });

  it('disables accordion when loading', () => {
    renderComponent({ ...defaultProps, loading: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
