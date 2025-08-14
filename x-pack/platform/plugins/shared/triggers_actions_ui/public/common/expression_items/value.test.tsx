/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ValueExpression } from './value';

// Helper function to render with IntlProvider
const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('value expression', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders description and value', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={jest.fn()}
      />
    );

    // Initially, only the button should be visible
    expect(screen.getByTestId('valueExpression')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();

    // Open the popover to see the form elements
    await user.click(screen.getByTestId('valueExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('valueFieldTitle')).toBeInTheDocument();
    });
    expect(screen.getByTestId('valueFieldNumber')).toBeInTheDocument();
    expect(screen.getByTestId('valueFieldTitle')).toHaveTextContent('test');
    expect(screen.getByTestId('valueFieldNumber')).toHaveValue(1000);
  });

  it('renders errors', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={['value is not valid']}
        onChangeSelectedValue={jest.fn()}
      />
    );

    // Open the popover to see the form elements
    await user.click(screen.getByTestId('valueExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('valueFieldNumber')).toBeInTheDocument();
    });

    const numberInput = screen.getByTestId('valueFieldNumber');
    expect(numberInput).toBeInvalid();
    expect(screen.getByText('value is not valid')).toBeInTheDocument();
  });

  it('renders closed popover initially and opens on click', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={jest.fn()}
      />
    );

    // Initially, only the button should be visible
    expect(screen.getByTestId('valueExpression')).toBeInTheDocument();
    expect(screen.queryByTestId('valueFieldTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('valueFieldNumber')).not.toBeInTheDocument();

    // Click to open the popover
    await user.click(screen.getByTestId('valueExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('valueFieldTitle')).toBeInTheDocument();
    });
    expect(screen.getByTestId('valueFieldNumber')).toBeInTheDocument();
  });

  it('emits onChangeSelectedValue action when value is updated', async () => {
    const user = userEvent.setup();
    const onChangeSelectedValue = jest.fn();
    renderWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={onChangeSelectedValue}
      />
    );

    // Open the popover
    await user.click(screen.getByTestId('valueExpression'));

    await waitFor(() => {
      expect(screen.getByTestId('valueFieldNumber')).toBeInTheDocument();
    });

    // Clear the mock before changing the value
    onChangeSelectedValue.mockClear();

    // Change the value
    const numberInput = screen.getByTestId('valueFieldNumber');
    fireEvent.change(numberInput, { target: { value: '3000' } });

    // Check that the function was called with the final value
    expect(onChangeSelectedValue).toHaveBeenCalledWith(3000);
  });
});
