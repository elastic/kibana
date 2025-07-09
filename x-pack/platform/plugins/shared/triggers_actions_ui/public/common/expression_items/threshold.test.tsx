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
import { ThresholdExpression } from './threshold';

// Helper function to render with IntlProvider
const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('threshold expression', () => {
  it('renders of builtin comparators', async () => {
    const user = userEvent.setup();
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();

    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );

    // Check that the button shows the correct value
    expect(screen.getByTestId('thresholdPopover')).toHaveTextContent('Is between');

    // Open the popover to access the form elements
    await user.click(screen.getByTestId('thresholdPopover'));

    // Now check for the comparator select
    expect(screen.getByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
  });

  it('renders with threshold title', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();

    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );

    expect(screen.getByTestId('thresholdPopover')).toHaveTextContent('Is between');
  });

  it('fires onChangeSelectedThreshold only when threshold actually changed', async () => {
    const user = userEvent.setup();
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();

    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );

    // Open the popover
    await user.click(screen.getByTestId('thresholdPopover'));

    expect(screen.getByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();

    // Change threshold value
    const thresholdInput = screen.getByTestId('alertThresholdInput0') as HTMLInputElement;
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '1000');

    expect(onChangeSelectedThreshold).toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).not.toHaveBeenCalled();

    jest.clearAllMocks();

    // Change comparator
    const comparatorSelect = screen.getByTestId('comparatorOptionsComboBox') as HTMLSelectElement;
    await user.selectOptions(comparatorSelect, '<');

    expect(onChangeSelectedThreshold).not.toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).toHaveBeenCalled();

    jest.clearAllMocks();

    // Change to between comparator
    await user.selectOptions(comparatorSelect, 'between');

    expect(onChangeSelectedThreshold).toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).toHaveBeenCalled();
  });

  it('renders threshold unit correctly', async () => {
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
        unit="%"
      />
    );

    expect(screen.getByTestId('thresholdPopover')).toHaveTextContent('Is above 10%');
  });

  it('renders the correct number of threshold inputs', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
      />
    );

    // Open the popover
    await user.click(screen.getByTestId('thresholdPopover'));

    expect(screen.getByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();

    // Change to between comparator
    const comparatorSelect = screen.getByTestId('comparatorOptionsComboBox') as HTMLSelectElement;
    await user.selectOptions(comparatorSelect, 'between');

    // Wait for the second input to appear
    await waitFor(() => {
      expect(screen.getByTestId('alertThresholdInput1')).toBeInTheDocument();
    });

    // Both inputs should be present
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();

    // Change back to single threshold comparator
    await user.selectOptions(comparatorSelect, '<');

    // Wait for the second input to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('alertThresholdInput1')).not.toBeInTheDocument();
    });

    // First input should still be present
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();
  });

  it('is valid when the threshold value is 0', async () => {
    const user = userEvent.setup();
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();

    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[0]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );

    // Open the popover to see the input
    await user.click(screen.getByTestId('thresholdPopover'));

    const thresholdInput = screen.getByTestId('alertThresholdInput0') as HTMLInputElement;
    expect(thresholdInput.value).toBe('0');
    expect(thresholdInput).not.toBeInvalid();
  });
});
