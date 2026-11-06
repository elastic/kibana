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
import { CaseStatuses } from '../../../../../common/types/domain';
import { getBuiltInStatuses } from '../../../../../common/utils/statuses';
import { renderWithTestingProviders } from '../../../../common/mock';
import { StatusField } from './status_field';

describe('StatusField', () => {
  const onStatusChange = jest.fn();
  const statuses = getBuiltInStatuses();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the currently selected status', () => {
    render(
      <StatusField
        statuses={statuses}
        selectedStatusKey={CaseStatuses.open}
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
        statuses={statuses}
        selectedStatusKey={CaseStatuses.open}
        onStatusChange={onStatusChange}
        isLoading={false}
        isDisabled={true}
      />
    );

    expect(screen.getByTestId('case-status-selection')).toBeDisabled();
  });

  describe('paused', () => {
    const onHold = {
      key: 'on_hold',
      label: 'On hold',
      category: CaseStatuses['in-progress'],
      order: 3,
      isDefault: false,
      disabled: false,
      pausesTimeTracking: true,
    };
    const pausedProps = {
      statuses: [...statuses, onHold],
      selectedStatusKey: 'on_hold',
      onStatusChange,
      isLoading: false,
      isDisabled: false,
      pausedAt: '2024-01-01T00:00:00.000Z',
      pauseReason: 'Awaiting customer',
      resumeStatus: statuses[1],
      onResume: jest.fn(),
    };

    it('shows the reason and a Resume link that names the target status', async () => {
      renderWithTestingProviders(<StatusField {...pausedProps} />);

      expect(screen.getByTestId('sidebar-status-paused')).toHaveTextContent('Awaiting customer');
      const resume = screen.getByTestId('sidebar-status-resume');
      expect(resume).toHaveAccessibleName('Resume to In progress');

      await userEvent.click(resume);
      expect(pausedProps.onResume).toHaveBeenCalled();
    });

    it('hides Resume without a target or when the field is disabled', () => {
      const { rerender } = renderWithTestingProviders(
        <StatusField {...pausedProps} resumeStatus={undefined} />
      );
      expect(screen.getByTestId('sidebar-status-paused')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-status-resume')).not.toBeInTheDocument();

      rerender(<StatusField {...pausedProps} isDisabled={true} />);
      expect(screen.queryByTestId('sidebar-status-resume')).not.toBeInTheDocument();
    });

    it('shows nothing about pausing when the case is not paused', () => {
      renderWithTestingProviders(<StatusField {...pausedProps} pausedAt={null} />);

      expect(screen.queryByTestId('sidebar-status-paused')).not.toBeInTheDocument();
    });
  });

  it('persists the change immediately, with no confirm step', async () => {
    render(
      <StatusField
        statuses={statuses}
        selectedStatusKey={CaseStatuses.open}
        onStatusChange={onStatusChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    await userEvent.click(screen.getByTestId('case-status-selection'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('case-status-selection-in-progress'));

    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ key: CaseStatuses['in-progress'] })
    );
    expect(screen.queryByTestId('template-field-confirm-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-field-cancel-status')).not.toBeInTheDocument();
  });
});
