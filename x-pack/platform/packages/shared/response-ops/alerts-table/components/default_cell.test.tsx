/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { DefaultCell } from './default_cell';
import type { CellComponentProps } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';
import { createPartialObjectMock } from '../utils/test';

const casesMap = getCasesMapMock();
const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
const alert: Alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  'kibana.alert.status': ['active'],
};

const props = createPartialObjectMock<CellComponentProps>({
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: 'kibana.alert.status',
  showAlertStatusWithFlapping: false,
});

describe('DefaultCell', () => {
  it('shows the value', async () => {
    render(<DefaultCell {...props} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows empty tag if the value is empty', async () => {
    render(<DefaultCell {...props} alert={{ ...alert, 'kibana.alert.status': [] }} />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows multiple values', async () => {
    render(
      <DefaultCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': ['active', 'recovered'] }}
      />
    );
    expect(screen.getByText('active, recovered')).toBeInTheDocument();
  });
});
