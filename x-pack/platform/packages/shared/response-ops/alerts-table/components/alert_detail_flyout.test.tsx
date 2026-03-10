/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { Alert } from '@kbn/alerting-types';
import type { AdditionalContext, RenderContext } from '../types';
import { createPartialObjectMock } from '../utils/test';
import AlertDetailFlyout from './alert_detail_flyout';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

const mockColumns = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Alert Status',
    id: 'kibana.alert.status',
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Last updated',
    id: '@timestamp',
    initialWidth: 230,
    schema: 'datetime',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Reason',
    id: 'kibana.alert.reason',
    linkField: '*',
  },
];

const mockAlert = {
  _id: 'dc80788f-f869-4f14-bedb-950186c9d2f8',
  _index: '.internal.alerts-stack.alerts-default-000001',
  '@timestamp': ['2023-12-22T09:23:08.244Z'],
  'kibana.alert.uuid': ['dc80788f-f869-4f14-bedb-950186c9d2f8'],
  'kibana.alert.status': ['active'],
  'kibana.alert.rule.producer': ['stackAlerts'],
  'kibana.alert.reason.text': [
    'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
  ],
  'kibana.alert.reason': [
    'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
  ],
  'kibana.alert.rule.category': ['Elasticsearch query'],
} as unknown as Alert;

const tabsData = [
  { name: 'Overview', subj: 'alertFlyoutOverviewTab' },
  { name: 'Table', subj: 'alertFlyoutTableTab' },
];

const mockOnExpandedAlertIndexChange = jest.fn();

const props = createPartialObjectMock<
  Omit<RenderContext<AdditionalContext>, 'expandedAlertIndex'> & { expandedAlertIndex: number }
>({
  expandedAlertIndex: 0,
  onExpandedAlertIndexChange: mockOnExpandedAlertIndexChange,
  alerts: [mockAlert, mockAlert],
  alertsCount: 2,
  columns: mockColumns,
  pageIndex: 0,
  pageSize: 20,
  isLoading: false,
});

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    http: httpServiceMock.createStartContract(),
    fieldFormats: fieldFormatsMock,
  },
});

const renderWithContext = (ui: ReactElement) =>
  render(<AlertsTableContextProvider value={context}>{ui}</AlertsTableContextProvider>);

describe('AlertDetailFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render high level details from the alert', async () => {
    renderWithContext(<AlertDetailFlyout {...props} />);
  });

  it('should correctly paginate forwards', async () => {
    renderWithContext(<AlertDetailFlyout {...props} />);
    await userEvent.click(screen.getByTestId('pagination-button-next'));
    expect(mockOnExpandedAlertIndexChange).toHaveBeenCalledWith(1);
  });

  it('should correctly paginate backwards', async () => {
    renderWithContext(<AlertDetailFlyout {...props} expandedAlertIndex={1} />);
    await userEvent.click(screen.getByTestId('pagination-button-previous'));
    expect(mockOnExpandedAlertIndexChange).toHaveBeenCalledWith(0);
  });

  describe('tabs', () => {
    it.each(tabsData)(`should render the $name tab`, ({ subj }) => {
      renderWithContext(<AlertDetailFlyout {...props} />);
      expect(screen.getByTestId(subj)).toBeInTheDocument();
    });

    it('should select the Overview tab by default', () => {
      renderWithContext(<AlertDetailFlyout {...props} />);
      expect(screen.getByTestId('alertFlyoutOverviewTab')).toHaveAttribute('aria-selected', 'true');
    });

    it.each(tabsData)(`should render the $name panel when active`, async ({ subj }) => {
      renderWithContext(<AlertDetailFlyout {...props} />);
      await userEvent.click(screen.getByTestId(subj));
      expect(screen.getByTestId(`${subj}Panel`)).toBeInTheDocument();
    });
  });
});
