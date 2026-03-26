/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SystemCell } from './system_cell';
import type { AdditionalContext, CellComponentProps, RenderContext } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';
import type { Alert } from '@kbn/alerting-types';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { createPartialObjectMock } from '../utils/test';
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS, ALERT_STATUS } from '@kbn/rule-data-utils';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

const casesMap = getCasesMapMock();
const maintenanceWindowsMap = getMaintenanceWindowsMapMock();

const alert: Alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  [ALERT_STATUS]: ['active'],
  [ALERT_CASE_IDS]: ['test-id'],
  [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-1'],
};

const props = createPartialObjectMock<CellComponentProps>({
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: 'kibana.alert.status',
  showAlertStatusWithFlapping: true,
});

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    application: applicationServiceMock.createStartContract(),
  },
});

const TestComponent = (_props: ComponentProps<typeof SystemCell>) => (
  <AlertsTableContextProvider value={context}>
    <SystemCell {..._props} />
  </AlertsTableContextProvider>
);

describe('SystemCell', () => {
  it('shows the status cell', async () => {
    render(<TestComponent {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the cases cell', async () => {
    render(<TestComponent {...props} columnId="kibana.alert.case_ids" />);
    expect(screen.getByText('Test case')).toBeInTheDocument();
  });

  it('shows the maintenance windows cell', async () => {
    render(<TestComponent {...props} columnId="kibana.alert.maintenance_window_ids" />);
    expect(screen.getByText('test-title')).toBeInTheDocument();
  });

  it('shows the cell if the columnId is not registered to the map', async () => {
    render(<TestComponent {...props} columnId="kibana.alert.end" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
