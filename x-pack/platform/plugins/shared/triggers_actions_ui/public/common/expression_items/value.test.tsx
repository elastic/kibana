/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ValueExpression } from './value';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('value expression', () => {
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

    expect(screen.getByTestId('valueExpression')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();

    await user.click(screen.getByTestId('valueExpression'));

    expect(await screen.findByTestId('valueFieldTitle')).toBeInTheDocument();
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

    await user.click(screen.getByTestId('valueExpression'));

    const numberInput = await screen.findByTestId('valueFieldNumber');

    expect(numberInput).toBeInTheDocument();
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

    expect(screen.getByTestId('valueExpression')).toBeInTheDocument();
    expect(screen.queryByTestId('valueFieldTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('valueFieldNumber')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('valueExpression'));

    expect(await screen.findByTestId('valueFieldTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('valueFieldNumber')).toBeInTheDocument();
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

    await user.click(screen.getByTestId('valueExpression'));

    const numberInput = await screen.findByTestId('valueFieldNumber');
    onChangeSelectedValue.mockClear();
    fireEvent.change(numberInput, { target: { value: '3000' } });

    expect(onChangeSelectedValue).toHaveBeenLastCalledWith(3000);
  });
});
