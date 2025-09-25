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
import { OfExpression } from './of';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('of expression', () => {
  it('renders of builtin aggregation types', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggField = jest.fn();

    renderWithIntl(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
      />
    );

    const button = screen.getByTestId('ofExpressionPopover');

    expect(button).toHaveTextContent('of test');

    await user.click(screen.getByTestId('ofExpressionPopover'));

    expect(await screen.findByTestId('availableFieldsOptionsComboBox')).toBeInTheDocument();
  });

  it('renders with custom aggregation types', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggField = jest.fn();

    renderWithIntl(
      <OfExpression
        aggType="test2"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test2', text: 'test text' }]}
        aggField="test2"
        onChangeSelectedAggField={onChangeSelectedAggField}
        customAggTypesOptions={{
          test1: {
            text: 'Test1()',
            fieldRequired: false,
            value: 'test1',
            validNormalizedTypes: [],
          },
          test2: {
            text: 'Test2()',
            fieldRequired: true,
            validNormalizedTypes: ['number'],
            value: 'test2',
          },
        }}
      />
    );

    const button = screen.getByTestId('ofExpressionPopover');

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('of test2');
    await user.click(button);

    expect(await screen.findByTestId('availableFieldsOptionsComboBox')).toBeInTheDocument();
  });

  it('renders with default aggregation type preselected if no aggType was set', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggField = jest.fn();

    renderWithIntl(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
      />
    );

    const button = screen.getByTestId('ofExpressionPopover');

    await user.click(button);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('of')).toHaveLength(2); // One in button, one in popover title
  });

  it('renders a helptext when passed as a prop', async () => {
    const user = userEvent.setup();
    const onChangeSelectedAggField = jest.fn();

    renderWithIntl(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
        helpText="Helptext test message"
      />
    );

    await user.click(screen.getByTestId('ofExpressionPopover'));

    expect(await screen.findByText('Helptext test message')).toBeInTheDocument();
  });

  it('clears selected agg field if fields does not contain current selection', async () => {
    const onChangeSelectedAggField = jest.fn();

    renderWithIntl(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[
          {
            normalizedType: 'number',
            name: 'test',
            type: 'long',
            searchable: true,
            aggregatable: true,
          },
        ]}
        aggField="notavailable"
        onChangeSelectedAggField={onChangeSelectedAggField}
      />
    );

    await waitFor(() => {
      expect(onChangeSelectedAggField).toHaveBeenCalledWith(undefined);
    });
  });
});
