/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import { loadGlobalConnectorExecutionKPIAggregations } from '../../../lib/action_connector_api/load_execution_kpi_aggregations';
import { ConnectorEventLogListKPI } from './actions_connectors_event_log_list_kpi';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn().mockReturnValue({
      services: {
        notifications: { toast: { addDanger: vi.fn() } },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/action_connector_api/load_execution_kpi_aggregations', () => {
  const mocked = {
    loadGlobalConnectorExecutionKPIAggregations: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/get_experimental_features', () => {
  const mocked = {
    getIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockKpiResponse = {
  success: 4,
  unknown: 0,
  failure: 60,
  warning: 10,
};

const loadGlobalExecutionKPIAggregationsMock =
  loadGlobalConnectorExecutionKPIAggregations as unknown as MockedFunction<any>;

describe('actions_connectors_event_log_list_kpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getIsExperimentalFeatureEnabled as Mock<any, any>).mockImplementation(() => false);
    loadGlobalExecutionKPIAggregationsMock.mockResolvedValue(mockKpiResponse);
  });

  it('renders correctly', async () => {
    render(
      <ConnectorEventLogListKPI
        dateStart="now-24h"
        dateEnd="now"
        loadGlobalConnectorExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    const successOutcome = screen.getByTestId('connectorEventLogKpi-successOutcome');
    const warningOutcome = screen.getByTestId('connectorEventLogKpi-warningOutcome');
    const failureOutcome = screen.getByTestId('connectorEventLogKpi-failureOutcome');

    expect(within(successOutcome).getByText('--')).toBeInTheDocument();
    expect(within(warningOutcome).getByText('--')).toBeInTheDocument();
    expect(within(failureOutcome).getByText('--')).toBeInTheDocument();

    await waitFor(() => {
      expect(loadGlobalConnectorExecutionKPIAggregations).toHaveBeenCalledWith(
        expect.objectContaining({
          message: undefined,
          outcomeFilter: undefined,
        })
      );
    });

    expect(
      await within(successOutcome).findByText(`${mockKpiResponse.success}`)
    ).toBeInTheDocument();
    expect(within(warningOutcome).getByText(`${mockKpiResponse.warning}`)).toBeInTheDocument();
    expect(within(failureOutcome).getByText(`${mockKpiResponse.failure}`)).toBeInTheDocument();
  });

  it('calls KPI API with filters', async () => {
    render(
      <ConnectorEventLogListKPI
        dateStart="now-24h"
        dateEnd="now"
        message="test"
        outcomeFilter={['status: 123', 'test:456']}
        loadGlobalConnectorExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    await waitFor(() => {
      expect(loadGlobalExecutionKPIAggregationsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test',
          outcomeFilter: ['status: 123', 'test:456'],
        })
      );
    });
  });
});
