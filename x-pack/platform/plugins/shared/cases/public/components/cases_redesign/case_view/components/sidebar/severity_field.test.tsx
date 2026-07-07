/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import { CaseSeverity } from '../../../../../../common/types/domain';
import { SeverityField } from './severity_field';

describe('SeverityField', () => {
  const onSeverityChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the currently selected severity', () => {
    render(
      <SeverityField
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    expect(screen.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
  });

  it('disables the selector when isDisabled is true', () => {
    render(
      <SeverityField
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={true}
      />
    );

    expect(screen.getByTestId('case-severity-selection')).toBeDisabled();
  });

  it('shows a loading state on the selector when isLoading is true', () => {
    render(
      <SeverityField
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={true}
        isDisabled={false}
      />
    );

    expect(screen.getByTestId('case-severity-selection')).toHaveClass(
      'euiSuperSelectControl-isLoading'
    );
  });

  it('does not call onSeverityChange until the change is confirmed', async () => {
    render(
      <SeverityField
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    await userEvent.click(screen.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('case-severity-selection-high'));

    expect(onSeverityChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('template-field-confirm-severity')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-cancel-severity')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('template-field-confirm-severity'));

    expect(onSeverityChange).toHaveBeenCalledWith(CaseSeverity.HIGH);
  });

  it('reverts the pending change when cancel is clicked', async () => {
    render(
      <SeverityField
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    await userEvent.click(screen.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('case-severity-selection-high'));
    await userEvent.click(screen.getByTestId('template-field-cancel-severity'));

    expect(onSeverityChange).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
    expect(screen.queryByTestId('template-field-confirm-severity')).not.toBeInTheDocument();
  });
});
