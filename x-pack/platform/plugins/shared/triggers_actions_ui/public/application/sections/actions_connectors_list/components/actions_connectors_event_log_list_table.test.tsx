/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { loadGlobalConnectorExecutionLogAggregations } from '../../../lib/action_connector_api/load_execution_log_aggregations';
import { ConnectorEventLogListTable } from './actions_connectors_event_log_list_table';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

jest.mock('../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../common/lib/kibana'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  }),
}));

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('../../../lib/action_connector_api/load_execution_log_aggregations', () => ({
  loadGlobalConnectorExecutionLogAggregations: jest.fn(),
}));

const mockResponse = {
  total: 1,
  data: [
    {
      connector_id: '86020b10-9b3b-11ed-8422-2f5a388a317d',
      connector_name: 'test connector',
      duration_ms: 0,
      id: '3895f21e-8de8-416f-9ab2-6ca5f8a4b294',
      message: 'action executed: .server-log:86020b10-9b3b-11ed-8422-2f5a388a317d: test',
      schedule_delay_ms: 2923,
      space_ids: ['default'],
      status: 'success',
      timed_out: false,
      timestamp: '2023-01-23T16:41:01.260Z',
      version: '8.7.0',
    },
  ],
};

const loadGlobalExecutionLogAggregationsMock =
  loadGlobalConnectorExecutionLogAggregations as unknown as jest.MockedFunction<any>;

describe('actions_connectors_event_log_list_table', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadGlobalExecutionLogAggregationsMock.mockResolvedValue(mockResponse);
  });

  it('renders correctly', async () => {
    renderWithI18n(
      <ConnectorEventLogListTable
        refreshToken={0}
        initialPageSize={50}
        hasConnectorNames={true}
        hasAllSpaceSwitch={true}
        loadGlobalConnectorExecutionLogAggregations={loadGlobalExecutionLogAggregationsMock}
      />
    );

    // Wait for the load to resolve and the API to be called
    await waitFor(() => {
      expect(loadGlobalConnectorExecutionLogAggregations).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '',
          namespaces: undefined,
          outcomeFilter: [],
          page: 0,
          perPage: 50,
          sort: [],
        })
      );
    });

    const getCellsByColumn = (columnId: string) =>
      within(screen.getByRole('grid'))
        .getAllByRole('gridcell')
        .filter((cell: HTMLElement) => cell.getAttribute('data-gridcell-column-id') === columnId);

    // After load, check data grid cell content
    await waitFor(() => {
      expect(getCellsByColumn('status')[0]).toHaveTextContent('succeeded');
    });

    expect(getCellsByColumn('connector_name')[0]).toHaveTextContent('test connector');
    expect(getCellsByColumn('message')[0]).toHaveTextContent(
      'action executed: .server-log:86020b10-9b3b-11ed-8422-2f5a388a317d: test'
    );
  });
});
