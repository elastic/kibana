/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ForLastExpression } from './for_the_last';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('for the last expression', () => {
  it('renders with defined options', async () => {
    const user = userEvent.setup();
    const onChangeWindowSize = jest.fn();
    const onChangeWindowUnit = jest.fn();

    renderWithIntl(
      <ForLastExpression
        errors={{ timeWindowSize: [] }}
        timeWindowSize={5}
        timeWindowUnit={'m'}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
    );

    expect(screen.getByTestId('forLastExpression')).toHaveTextContent('5 minutes');

    await user.click(screen.getByTestId('forLastExpression'));

    expect(screen.getByTestId('timeWindowSizeNumber')).toBeInTheDocument();
    expect(screen.getByTestId('timeWindowUnitSelect')).toBeInTheDocument();
  });

  it('renders with default timeWindowSize and timeWindowUnit', async () => {
    const user = userEvent.setup();
    const onChangeWindowSize = jest.fn();
    const onChangeWindowUnit = jest.fn();

    renderWithIntl(
      <ForLastExpression
        errors={{ timeWindowSize: [] }}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
    );

    expect(screen.getByTestId('forLastExpression')).toHaveTextContent('? seconds');

    await user.click(screen.getByTestId('forLastExpression'));

    expect(screen.getByText('For the last')).toBeInTheDocument();

    const numberInput = screen.getByTestId('timeWindowSizeNumber') as HTMLInputElement;
    const selectInput = screen.getByTestId('timeWindowUnitSelect') as HTMLSelectElement;

    expect(numberInput.value).toBe('');
    expect(selectInput.value).toBe('s');
  });

  it('renders with recommended time size warning', async () => {
    const user = userEvent.setup();
    const onChangeWindowSize = jest.fn();
    const onChangeWindowUnit = jest.fn();
    renderWithIntl(
      <ForLastExpression
        errors={{ timeWindowSize: [] }}
        timeWindowSize={2}
        timeWindowUnit={'m'}
        isTimeSizeBelowRecommended={true}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
    );
    expect(screen.getByTestId('forLastExpression')).toHaveTextContent('2 minutes');

    await user.click(screen.getByTestId('forLastExpression'));
    expect(screen.getByText('For the last')).toBeInTheDocument();
    expect(screen.getByText('Value is too low, possible alerting noise')).toBeInTheDocument();
  });
});
