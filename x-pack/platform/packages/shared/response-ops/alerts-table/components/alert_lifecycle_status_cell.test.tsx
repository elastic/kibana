/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { AlertLifecycleStatusCell } from './alert_lifecycle_status_cell';
import type { CellComponentProps } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';

describe('AlertLifecycleStatusCell', () => {
  const casesMap = getCasesMapMock();
  const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
  const alert: Alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.status': ['active'],
  };

  const props = {
    isLoading: false,
    alert,
    cases: casesMap,
    maintenanceWindows: maintenanceWindowsMap,
    columnId: 'kibana.alert.status',
    showAlertStatusWithFlapping: true,
    // Assertion used to avoid defining all the (numerous) context properties
  } as CellComponentProps;

  it('shows the status', async () => {
    render(<AlertLifecycleStatusCell {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not shows the status if showAlertStatusWithFlapping=false', async () => {
    render(<AlertLifecycleStatusCell {...props} showAlertStatusWithFlapping={false} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('shows the status with flapping', async () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.flapping': ['true'] }}
      />
    );
    expect(screen.getByText('Flapping')).toBeInTheDocument();
  });

  it('shows the status with multiple values', async () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': ['active', 'recovered'] }}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the default cell if the status is empty', async () => {
    render(<AlertLifecycleStatusCell {...props} alert={{ ...alert, 'kibana.alert.status': [] }} />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });
});

// Additional tests for acknowledged badge
describe('AlertLifecycleStatusCell - acknowledged badge', () => {
  const casesMap = getCasesMapMock();
  const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
  const alert: Alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.status': ['active'],
  };

  const props = {
    isLoading: false,
    alert,
    cases: casesMap,
    maintenanceWindows: maintenanceWindowsMap,
    columnId: 'kibana.alert.status',
    showAlertStatusWithFlapping: true,
  } as CellComponentProps;

  it('shows the acknowledged badge when workflow status is acknowledged', () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.workflow_status': ['acknowledged'] }}
      />
    );
    expect(screen.getByTestId('alertAcknowledgedBadge')).toBeInTheDocument();
  });

  it('does not show the acknowledged badge when workflow status is open', () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.workflow_status': ['open'] }}
      />
    );
    expect(screen.queryByTestId('alertAcknowledgedBadge')).not.toBeInTheDocument();
  });

  it('does not show the acknowledged badge when workflow status is not set', () => {
    render(<AlertLifecycleStatusCell {...props} />);
    expect(screen.queryByTestId('alertAcknowledgedBadge')).not.toBeInTheDocument();
  });
});
