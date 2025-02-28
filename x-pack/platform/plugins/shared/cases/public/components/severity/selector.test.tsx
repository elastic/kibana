/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/types/domain';
import { render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import React from 'react';
import { SeveritySelector } from './selector';
import userEvent from '@testing-library/user-event';

describe('Severity field selector', () => {
  const onSeverityChange = jest.fn();
  it('renders a list of severity fields', () => {
    render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    expect(screen.getByTestId('case-severity-selection')).toBeTruthy();
    expect(screen.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
  });

  it('renders a list of severity options when clicked', async () => {
    render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );
    await userEvent.click(screen.getByTestId('case-severity-selection'));
    expect(screen.getByTestId('case-severity-selection-low')).toBeTruthy();
    expect(screen.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
    expect(screen.getByTestId('case-severity-selection-high')).toBeTruthy();
    expect(screen.getByTestId('case-severity-selection-critical')).toBeTruthy();
  });

  it('calls onSeverityChange with the newly selected severity when clicked', async () => {
    render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );
    await userEvent.click(screen.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('case-severity-selection-low')).toBeTruthy();
    await userEvent.click(screen.getByTestId('case-severity-selection-low'));
    expect(onSeverityChange).toHaveBeenLastCalledWith('low');
  });
});
