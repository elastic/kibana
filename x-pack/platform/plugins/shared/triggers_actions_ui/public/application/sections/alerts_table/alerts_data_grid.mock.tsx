/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields } from '@kbn/alerting-types';
import {
  AdditionalContext,
  Alerts,
  AlertsDataGridProps,
  AlertsField,
  FetchAlertData,
  RenderContext,
  RowSelectionState,
} from '../../../types';
import { getCasesMapMock } from './cases/index.mock';
import { getMaintenanceWindowsMock } from './maintenance_windows/index.mock';
import { EuiButton, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { identity } from 'lodash';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import {
  ALERT_CASE_IDS,
  ALERT_FLAPPING,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { FIELD_BROWSER_CUSTOM_CREATE_BTN_TEST_ID } from './constants';

export type BaseAlertsDataGridProps = AlertsDataGridProps;
export type TestAlertsDataGridProps = Partial<Omit<BaseAlertsDataGridProps, 'renderContext'>> & {
  renderContext?: Partial<RenderContext<AdditionalContext>>;
};

export const mockFieldFormatsRegistry = {
  deserialize: jest.fn(() => ({
    id: 'string',
    convert: jest.fn().mockImplementation(identity),
  })),
} as unknown as FieldFormatsRegistry;

export const mockBrowserFields: BrowserFields = {
  kibana: {
    fields: {
      [AlertsField.uuid]: {
        category: 'kibana',
        name: AlertsField.uuid,
      },
      [AlertsField.name]: {
        category: 'kibana',
        name: AlertsField.name,
      },
      [AlertsField.reason]: {
        category: 'kibana',
        name: AlertsField.reason,
      },
    },
  },
};

export const mockColumns = [
  {
    id: ALERT_RULE_NAME,
    displayAsText: 'Name',
  },
  {
    id: ALERT_REASON,
    displayAsText: 'Reason',
  },
  {
    id: ALERT_STATUS,
    displayAsText: 'Alert status',
  },
  {
    id: ALERT_CASE_IDS,
    displayAsText: 'Cases',
  },
];

export const mockAlerts = [
  {
    [ALERT_RULE_NAME]: ['one'],
    [ALERT_REASON]: ['two'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [true],
    [ALERT_CASE_IDS]: ['test-id'],
  },
  {
    [ALERT_RULE_NAME]: ['three'],
    [ALERT_REASON]: ['four'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [false],
    [ALERT_CASE_IDS]: ['test-id-2'],
  },
  {
    [ALERT_RULE_NAME]: ['five'],
    [ALERT_REASON]: ['six'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [true],
  },
  {
    [ALERT_RULE_NAME]: ['seven'],
    [ALERT_REASON]: ['eight'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [false],
  },
] as unknown as Alerts;
export const mockOldAlertsData = [
  [
    {
      field: AlertsField.name,
      value: ['one'],
    },
    {
      field: AlertsField.reason,
      value: ['two'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['three'],
    },
    {
      field: AlertsField.reason,
      value: ['four'],
    },
  ],
] as FetchAlertData['oldAlertsData'];
export const mockEcsData = [
  [
    {
      '@timestamp': ['2023-01-28T10:48:49.559Z'],
      _id: 'SomeId',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['one'],
          },
          reason: ['two'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-27T10:48:49.559Z'],
      _id: 'SomeId2',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['three'],
          },
          reason: ['four'],
        },
      },
    },
  ],
] as FetchAlertData['ecsAlertsData'];

export const mockCases = getCasesMapMock();
export const mockMaintenanceWindows = getMaintenanceWindowsMock().reduce(
  (acc, val) => acc.set(val.id, val),
  new Map()
);

export const mockBulkActionsState = {
  rowSelection: new Map<number, RowSelectionState>(),
  isAllSelected: false,
  areAllVisibleRowsSelected: false,
  rowCount: 4,
  updatedAt: Date.now(),
};

export const mockRenderContext = {
  tableId: 'test-table',
  showAlertStatusWithFlapping: true,
  columns: mockColumns,
  refresh: jest.fn(),
  isLoading: false,
  isLoadingAlerts: false,
  alerts: mockAlerts,
  ecsAlertsData: mockEcsData,
  oldAlertsData: mockOldAlertsData,
  alertsCount: mockAlerts.length,
  browserFields: mockBrowserFields,
  isLoadingCases: false,
  cases: mockCases,
  isLoadingMaintenanceWindows: false,
  maintenanceWindows: mockMaintenanceWindows,
  isLoadingMutedAlerts: false,
  mutedAlerts: {},
  pageIndex: 0,
  pageSize: 1,
  fieldFormats: mockFieldFormatsRegistry,
  openAlertInFlyout: jest.fn(),
  bulkActionsStore: [
    mockBulkActionsState,
    jest.fn(),
  ] as unknown as RenderContext<AdditionalContext>['bulkActionsStore'],
  renderCellValue: jest.fn().mockImplementation((props) => {
    return `${props.colIndex}:${props.rowIndex}`;
  }),
  renderFlyoutHeader: jest.fn(),
  renderFlyoutBody: jest.fn(),
  renderFlyoutFooter: jest.fn(),
  renderActionsCell: () => (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="analyzeEvent"
        color="primary"
        onClick={() => {}}
        size="s"
        data-test-subj="testAction"
        aria-label="Test action"
      />
    </EuiFlexItem>
  ),
} as RenderContext<AdditionalContext>;

export const mockDataGridProps: Partial<BaseAlertsDataGridProps> = {
  pageSizeOptions: [1, 10, 20, 50, 100],
  leadingControlColumns: [],
  trailingControlColumns: [],
  visibleColumns: mockColumns.map((c) => c.id),
  'data-test-subj': 'testTable',
  onToggleColumn: jest.fn(),
  onResetColumns: jest.fn(),
  onChangeVisibleColumns: jest.fn(),
  query: {},
  sort: [],
  alertsQuerySnapshot: { request: [], response: [] },
  onSortChange: jest.fn(),
  onChangePageIndex: jest.fn(),
  onChangePageSize: jest.fn(),
  getBulkActions: () => [
    {
      id: 0,
      items: [
        {
          label: 'Fake Bulk Action',
          key: 'fakeBulkAction',
          'data-test-subj': 'fake-bulk-action',
          disableOnQuery: false,
          onClick: () => {},
        },
      ],
    },
  ],
  fieldsBrowserOptions: {
    createFieldButton: () => <EuiButton data-test-subj={FIELD_BROWSER_CUSTOM_CREATE_BTN_TEST_ID} />,
  },
  casesConfiguration: { featureId: 'test-feature-id', owner: ['test-owner'] },
};
