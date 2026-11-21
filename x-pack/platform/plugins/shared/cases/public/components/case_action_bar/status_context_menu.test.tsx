/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusContextMenu } from './status_context_menu';
import { renderWithTestingProviders } from '../../common/mock';
import { useShouldDisableStatus } from '../actions/status/use_should_disable_status';

jest.mock('../actions/status/use_should_disable_status');

describe('StatusContextMenu', () => {
  const onStatusChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => false);
  });

  it('renders', async () => {
    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    expect(screen.getByTestId('case-view-status-dropdown')).toBeInTheDocument();
  });

  it('renders a simple status badge when disabled', async () => {
    renderWithTestingProviders(
      <StatusContextMenu
        disabled={true}
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    expect(screen.queryByTestId('case-view-status-dropdown')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-status-badge-open')).toBeInTheDocument();
  });

  it('renders the current status correctly', async () => {
    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.closed}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    expect(screen.getByTestId('case-view-status-dropdown')).toHaveTextContent('Closed');
  });

  it('changes the status', async () => {
    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(
      within(screen.getByTestId('case-status-badge-popover-button-open')).getByRole('button')
    );
    await userEvent.click(await screen.findByTestId('case-view-status-dropdown-in-progress'));

    expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
  });

  it('does not render the button at all if the status cannot change', async () => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => true);
    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(
      within(screen.getByTestId('case-status-badge-popover-button-open')).getByRole('button')
    );
    expect(await screen.findByText('Change status')).toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);

    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it('updates menu items when shouldDisableStatus changes', async () => {
    const mockShouldDisableStatus = jest.fn().mockReturnValue(false);
    (useShouldDisableStatus as jest.Mock).mockReturnValue(mockShouldDisableStatus);

    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(
      within(screen.getByTestId('case-status-badge-popover-button-open')).getByRole('button')
    );

    expect(mockShouldDisableStatus).toHaveBeenCalledWith([{ status: CaseStatuses.open }]);
  });

  it('handles all statuses being disabled', async () => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => true);

    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(
      within(screen.getByTestId('case-status-badge-popover-button-open')).getByRole('button')
    );
    expect(await screen.findByText('Change status')).toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('correctly evaluates each status option', async () => {
    renderWithTestingProviders(
      <StatusContextMenu
        currentStatus={CaseStatuses.open}
        totalAlerts={0}
        syncAlertsEnabled={false}
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(
      within(screen.getByTestId('case-status-badge-popover-button-open')).getByRole('button')
    );

    expect(await screen.findByTestId('case-view-status-dropdown-open')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-status-dropdown-in-progress')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-status-dropdown-closed')).toBeInTheDocument();
  });
});
