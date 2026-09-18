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
import { ThresholdExpression } from './threshold';

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

    const button = screen.getByTestId('thresholdPopover');

    expect(button).toHaveTextContent('Is between');

    await user.click(button);

    expect(await screen.findByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
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

    await user.click(screen.getByTestId('thresholdPopover'));

    expect(await screen.findByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();

    const thresholdInput = screen.getByTestId('alertThresholdInput0');

    // Use a single change event instead of per-character typing to avoid multiple handler calls
    fireEvent.change(thresholdInput, { target: { value: '1000' } });

    await waitFor(() => {
      expect(onChangeSelectedThreshold).toHaveBeenCalledTimes(1);
    });
    expect(onChangeSelectedThresholdComparator).not.toHaveBeenCalled();

    jest.clearAllMocks();

    const comparatorSelect = screen.getByTestId('comparatorOptionsComboBox');
    await user.selectOptions(comparatorSelect, '<');

    expect(onChangeSelectedThreshold).not.toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).toHaveBeenCalled();

    jest.clearAllMocks();

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

    await user.click(screen.getByTestId('thresholdPopover'));

    expect(await screen.findByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('alertThresholdInput0')).toBeInTheDocument();

    const comparatorSelect = screen.getByTestId('comparatorOptionsComboBox');
    await user.selectOptions(comparatorSelect, 'between');

    expect(await screen.findByTestId('alertThresholdInput1')).toBeInTheDocument();
    expect(await screen.findByTestId('alertThresholdInput0')).toBeInTheDocument();

    await user.selectOptions(comparatorSelect, '<');

    await waitFor(() => {
      expect(screen.queryByTestId('alertThresholdInput1')).not.toBeInTheDocument();
    });

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

    await user.click(screen.getByTestId('thresholdPopover'));

    const thresholdInput = screen.getByTestId('alertThresholdInput0') as HTMLInputElement;

    expect(thresholdInput.value).toBe('0');
    expect(thresholdInput).not.toBeInvalid();
  });

  it('does not open the popover by default', () => {
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
      />
    );

    expect(screen.queryByTestId('comparatorOptionsComboBox')).not.toBeInTheDocument();
  });

  it('opens the popover on mount when initialPopoverOpen is set', () => {
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
        initialPopoverOpen
      />
    );

    expect(screen.getByTestId('comparatorOptionsComboBox')).toBeInTheDocument();
  });

  it('renders a badge inside the closed expression, next to the value', () => {
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
        badge={<span data-test-subj="myBadge">Warning</span>}
      />
    );

    const button = screen.getByTestId('thresholdPopover');
    expect(button).toHaveTextContent('Is above 10Warning');
    expect(screen.getByTestId('myBadge')).toBeInTheDocument();
  });

  it('shows an invalid border instead of the warning icon when a badge is present', () => {
    renderWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        errors={{ threshold0: ['Threshold is required.'], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
        badge={<span data-test-subj="myBadge">Warning</span>}
      />
    );

    const button = screen.getByTestId('thresholdPopover');
    // No collision-prone floating icon when there's a badge/remove-button in the way...
    expect(button.querySelector('[data-euiicon-type="warning"]')).not.toBeInTheDocument();
    // ...instead the border communicates the invalid state.
    expect(button.style.border).toContain('solid');
  });
});
