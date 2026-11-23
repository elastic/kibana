/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { esqlConversionFailureReasonMessages } from '@kbn/lens-common';
import { EsqlOptionsPopover, type EsqlOptionsPopoverProps } from './esql_options_popover';

// EuiPopover panels animate in with `pointer-events: none`, which jsdom never clears.
const user = userEvent.setup({ pointerEventsCheck: 0 });

const renderPopover = (propsOverrides: Partial<EsqlOptionsPopoverProps> = {}) => {
  const props: EsqlOptionsPopoverProps = {
    useEsql: false,
    availability: { isAvailable: true },
    onUseEsqlChange: jest.fn(),
    convertToEsql: {
      isDisabled: false,
      tooltip: 'Convert visualization to ES|QL',
      onClick: jest.fn(),
    },
    ...propsOverrides,
  };
  render(<EsqlOptionsPopover {...props} />);
  return props;
};

const openPopover = async () => {
  await user.click(screen.getByTestId('lnsEsqlOptionsButton'));
};

describe('EsqlOptionsPopover', () => {
  it('renders a trigger labelled "ES|QL options" and keeps the content closed', () => {
    renderPopover();
    expect(screen.getByRole('button', { name: 'ES|QL options' })).toBeInTheDocument();
    expect(screen.queryByTestId('lnsEsqlOptionsUseEsqlSwitch')).not.toBeInTheDocument();
  });

  it('uses a neutral trigger when ES|QL is off or works', () => {
    const { unmount } = render(
      <EsqlOptionsPopover
        useEsql={false}
        availability={{ isAvailable: true }}
        onUseEsqlChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('lnsEsqlOptionsButton').className).not.toMatch(/success|warning/);
    unmount();

    render(
      <EsqlOptionsPopover
        useEsql
        availability={{ isAvailable: true }}
        onUseEsqlChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('lnsEsqlOptionsButton').className).not.toMatch(/success|warning/);
  });

  it('shows a warning trigger when ES|QL is on but the chart falls back to DSL', () => {
    renderPopover({
      useEsql: true,
      availability: { isAvailable: false, reason: 'formula_not_supported' },
    });
    const trigger = screen.getByRole('button', {
      name: 'ES|QL options: this chart falls back to DSL',
    });
    expect(trigger.className).toMatch(/warning/);
  });

  it('keeps the trigger neutral when ES|QL is off and unavailable', () => {
    renderPopover({
      useEsql: false,
      availability: { isAvailable: false, reason: 'formula_not_supported' },
    });
    expect(screen.getByTestId('lnsEsqlOptionsButton').className).not.toMatch(/success|warning/);
  });

  it('shows the switch and the convert button when opened', async () => {
    renderPopover();
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeInTheDocument();
    expect(screen.getByTestId('lnsEsqlOptionsConvertButton')).toBeEnabled();
    expect(screen.queryByTestId('lnsEsqlOptionsUnavailableReason')).not.toBeInTheDocument();
  });

  it('reflects useEsql in the switch', async () => {
    renderPopover({ useEsql: true });
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeChecked();
  });

  it('reports the new value when the switch is toggled', async () => {
    const { onUseEsqlChange } = renderPopover({ useEsql: false });
    await openPopover();
    await user.click(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch'));
    expect(onUseEsqlChange).toHaveBeenCalledWith(true);
  });

  it('disables the switch and shows the reason when ES|QL is unavailable and off', async () => {
    const { onUseEsqlChange } = renderPopover({
      useEsql: false,
      availability: { isAvailable: false, reason: 'time_shift_not_supported' },
    });
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeDisabled();
    expect(screen.getByTestId('lnsEsqlOptionsUnavailableReason')).toHaveTextContent(
      `ES|QL is not available for this chart. ${esqlConversionFailureReasonMessages.time_shift_not_supported}`
    );
    expect(onUseEsqlChange).not.toHaveBeenCalled();
  });

  it('keeps the switch enabled and explains the DSL fallback when ES|QL is on but unavailable', async () => {
    const { onUseEsqlChange } = renderPopover({
      useEsql: true,
      availability: { isAvailable: false, reason: 'formula_not_supported' },
    });
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeEnabled();
    expect(screen.getByTestId('lnsEsqlOptionsUnavailableReason')).toHaveTextContent(
      `This chart currently fetches data with DSL. ${esqlConversionFailureReasonMessages.formula_not_supported}`
    );
    await user.click(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch'));
    expect(onUseEsqlChange).toHaveBeenCalledWith(false);
  });

  it('closes the popover and starts the conversion when the convert button is clicked', async () => {
    const onClick = jest.fn();
    renderPopover({ convertToEsql: { isDisabled: false, tooltip: 'Convert', onClick } });
    await openPopover();
    await user.click(screen.getByTestId('lnsEsqlOptionsConvertButton'));
    expect(onClick).toHaveBeenCalledTimes(1);
    // The popover unmounts after its close animation.
    await waitFor(() =>
      expect(screen.queryByTestId('lnsEsqlOptionsUseEsqlSwitch')).not.toBeInTheDocument()
    );
  });

  it('hides the convert action when it is not provided', async () => {
    renderPopover({ convertToEsql: undefined });
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeInTheDocument();
    expect(screen.queryByTestId('lnsEsqlOptionsConvertButton')).not.toBeInTheDocument();
  });

  it('disables the convert button independently of the switch', async () => {
    renderPopover({
      convertToEsql: { isDisabled: true, tooltip: 'Not convertible', onClick: jest.fn() },
    });
    await openPopover();
    expect(screen.getByTestId('lnsEsqlOptionsConvertButton')).toBeDisabled();
    expect(screen.getByTestId('lnsEsqlOptionsUseEsqlSwitch')).toBeEnabled();
  });
});
