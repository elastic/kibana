/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { WhenExpression } from './when';

// Helper function to render with IntlProvider
const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('when expression', () => {
  it('renders with builtin aggregation types', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggType = jest.fn();
    renderWithIntl(
      <WhenExpression aggType={'count'} onChangeSelectedAggType={onChangeSelectedAggType} />
    );

    // Initially, only the button should be visible
    expect(screen.getByTestId('whenExpression')).toBeInTheDocument();
    expect(screen.getByText('count()')).toBeInTheDocument();

    // Open the popover to see the select
    await user.click(screen.getByTestId('whenExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('whenExpressionSelect')).toBeInTheDocument();
    });

    const select = screen.getByTestId('whenExpressionSelect');
    expect(select).toHaveValue('count');

    // Check that all built-in options are present in the select
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('count()');
    expect(options[1]).toHaveTextContent('average()');
    expect(options[2]).toHaveTextContent('sum()');
    expect(options[3]).toHaveTextContent('min()');
    expect(options[4]).toHaveTextContent('max()');
  });

  it('renders with custom aggregation types', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggType = jest.fn();
    renderWithIntl(
      <WhenExpression
        aggType={'count'}
        onChangeSelectedAggType={onChangeSelectedAggType}
        customAggTypesOptions={{
          count: {
            text: 'Test1()',
            fieldRequired: false,
            value: 'test1',
            validNormalizedTypes: [],
          },
          avg: {
            text: 'Test2()',
            fieldRequired: true,
            validNormalizedTypes: ['number'],
            value: 'test2',
          },
        }}
      />
    );

    // Initially, only the button should be visible
    expect(screen.getByTestId('whenExpression')).toBeInTheDocument();
    expect(screen.getByText('Test1()')).toBeInTheDocument();

    // Open the popover to see the select
    await user.click(screen.getByTestId('whenExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('whenExpressionSelect')).toBeInTheDocument();
    });

    const select = screen.getByTestId('whenExpressionSelect');
    expect(select).toHaveValue('test1');

    // Check that custom options are present in the select
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Test1()');
    expect(options[1]).toHaveTextContent('Test2()');
  });

  it('renders when popover title', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggType = jest.fn();
    renderWithIntl(
      <WhenExpression aggType={'avg'} onChangeSelectedAggType={onChangeSelectedAggType} />
    );

    // Initially, only the button should be visible
    expect(screen.getByTestId('whenExpression')).toBeInTheDocument();
    expect(screen.getByText('average()')).toBeInTheDocument();

    // Open the popover
    await user.click(screen.getByTestId('whenExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('whenExpressionSelect')).toBeInTheDocument();
    });

    // Check that the select has the correct value
    const select = screen.getByTestId('whenExpressionSelect');
    expect(select).toHaveValue('avg');

    // Check that the popover title is rendered (use getAllByText to handle multiple instances)
    const whenElements = screen.getAllByText('when');
    expect(whenElements.length).toBeGreaterThan(0);
  });
});
