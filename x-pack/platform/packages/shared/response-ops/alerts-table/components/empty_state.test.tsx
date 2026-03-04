/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EmptyState } from './empty_state';
import userEvent from '@testing-library/user-event';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';

describe('EmptyState', () => {
  it('renders the empty state with default props', async () => {
    render(
      <IntlProvider locale="en">
        <EmptyState />
      </IntlProvider>
    );

    expect(await screen.findByTestId('alertsTableEmptyState')).toBeInTheDocument();

    expect(screen.getByText('No results match your search criteria')).toBeInTheDocument();
    expect(
      screen.getByText('Try searching over a longer period of time or modifying your search')
    ).toBeInTheDocument();
  });

  it('renders the empty state with props', async () => {
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
        />
      </IntlProvider>
    );

    expect(await screen.findByTestId('alertsTableEmptyState')).toBeInTheDocument();
    expect(screen.getByText('There are currently no alerts to display.')).toBeInTheDocument();
  });

  it('renders the error state when an error is provided', async () => {
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
          error={error}
        />
      </IntlProvider>
    );

    expect(await screen.findByText('Test error message')).toBeInTheDocument();
    expect(screen.queryByText('There are currently no alerts to display.')).not.toBeInTheDocument();
  });

  it('renders the reset button with Reset text when error has no field name', async () => {
    const mockReset = jest.fn();
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} onReset={mockReset} />
      </IntlProvider>
    );

    const resetButton = await screen.findByTestId('resetButton');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveTextContent('Reset');
  });

  it('renders the reset button with Reset Sort text when error has field name', async () => {
    const fieldWithError: SortCombinations = {
      ['kibana.alert.title']: { order: 'asc' },
    };
    const mockReset = jest.fn();
    const error = new Error('Test error message on field kibana.alert.title');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} onReset={mockReset} fieldWithSortingError={fieldWithError} />
      </IntlProvider>
    );

    const resetButton = await screen.findByTestId('resetButton');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveTextContent('Reset sort');
  });

  it('calls onReset correctly', async () => {
    const mockReset = jest.fn();
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} onReset={mockReset} />
      </IntlProvider>
    );

    expect(await screen.findByText('Test error message')).toBeInTheDocument();

    const resetButton = await screen.findByTestId('resetButton');
    expect(resetButton).toBeInTheDocument();

    userEvent.click(resetButton);
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
  });

  it('does not show reset button when it is not error', async () => {
    const mockReset = jest.fn();
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
          onReset={mockReset}
        />
      </IntlProvider>
    );

    expect(screen.queryByTestId('resetButton')).not.toBeInTheDocument();
  });

  it('does not render the reset button when onReset is not provided', async () => {
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} />
      </IntlProvider>
    );

    expect(screen.queryByTestId('resetButton')).not.toBeInTheDocument();
  });
});
