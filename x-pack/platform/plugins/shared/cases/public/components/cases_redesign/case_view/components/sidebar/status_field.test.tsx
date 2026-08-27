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
import { CaseStatuses } from '../../../../../../common/types/domain';
import { StatusField } from './status_field';

describe('StatusField', () => {
  const onStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the currently selected status', () => {
    render(
      <StatusField
        selectedStatus={CaseStatuses.open}
        onStatusChange={onStatusChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    expect(screen.getAllByTestId('case-status-selection-open').length).toBeTruthy();
  });

  it('disables the selector when isDisabled is true', () => {
    render(
      <StatusField
        selectedStatus={CaseStatuses.open}
        onStatusChange={onStatusChange}
        isLoading={false}
        isDisabled={true}
      />
    );

    expect(screen.getByTestId('case-status-selection')).toBeDisabled();
  });

  it('persists the change immediately, with no confirm step', async () => {
    render(
      <StatusField
        selectedStatus={CaseStatuses.open}
        onStatusChange={onStatusChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    await userEvent.click(screen.getByTestId('case-status-selection'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('case-status-selection-in-progress'));

    expect(onStatusChange).toHaveBeenCalledWith(CaseStatuses['in-progress']);
    expect(screen.queryByTestId('template-field-confirm-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-field-cancel-status')).not.toBeInTheDocument();
  });
});
