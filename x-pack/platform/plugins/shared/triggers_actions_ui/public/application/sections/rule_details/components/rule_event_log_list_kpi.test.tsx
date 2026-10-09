/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { loadExecutionKPIAggregations } from '../../../lib/rule_api/load_execution_kpi_aggregations';
import { loadGlobalExecutionKPIAggregations } from '../../../lib/rule_api/load_global_execution_kpi_aggregations';
import { RuleEventLogListKPI } from './rule_event_log_list_kpi';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib';
import type { IToasts } from '@kbn/core/public';

const addDangerMock = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      notifications: { toast: { addDanger: jest.fn() } },
    },
  }),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('../../../lib/rule_api/load_execution_kpi_aggregations', () => ({
  loadExecutionKPIAggregations: jest.fn(),
}));

jest.mock('../../../lib/rule_api/load_global_execution_kpi_aggregations', () => ({
  loadGlobalExecutionKPIAggregations: jest.fn(),
}));

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockKpiResponse = {
  success: 4,
  unknown: 0,
  failure: 60,
  warning: 10,
  activeAlerts: 100,
  newAlerts: 40,
  recoveredAlerts: 30,
  erroredActions: 60,
  triggeredActions: 140,
};

const loadExecutionKPIAggregationsMock =
  loadExecutionKPIAggregations as unknown as jest.MockedFunction<any>;
const loadGlobalExecutionKPIAggregationsMock =
  loadGlobalExecutionKPIAggregations as unknown as jest.MockedFunction<any>;

describe('rule_event_log_list_kpi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.notifications.toasts = {
      addDanger: addDangerMock,
    } as unknown as IToasts;
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadExecutionKPIAggregationsMock.mockResolvedValue(mockKpiResponse);
    loadGlobalExecutionKPIAggregationsMock.mockResolvedValue(mockKpiResponse);
  });

  it('renders correctly', async () => {
    renderWithI18n(
      <RuleEventLogListKPI
        ruleId="123"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    // NOTE: the component immediately enters loading state (isLoadingData = !kpi initially),
    // so EuiStat renders a spinner rather than '--' headings. We skip the pre-load assertions
    // and wait directly for the API call and resulting data.

    // Wait for data to load
    await waitFor(() => {
      expect(loadExecutionKPIAggregationsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          message: undefined,
          outcomeFilter: undefined,
        })
      );
    });

    expect(loadGlobalExecutionKPIAggregations).not.toHaveBeenCalled();

    // EuiStat renders its title as a <p class="euiStat__title">, not a semantic heading
    await waitFor(() => {
      expect(
        screen.getByTestId('ruleEventLogKpi-successOutcome').querySelector('.euiStat__title')
          ?.textContent
      ).toEqual(`${mockKpiResponse.success}`);
    });
    expect(
      screen.getByTestId('ruleEventLogKpi-warningOutcome').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.warning}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-failureOutcome').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.failure}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-activeAlerts').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.activeAlerts}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-newAlerts').querySelector('.euiStat__title')?.textContent
    ).toEqual(`${mockKpiResponse.newAlerts}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-recoveredAlerts').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.recoveredAlerts}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-erroredActions').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.erroredActions}`);
    expect(
      screen.getByTestId('ruleEventLogKpi-triggeredActions').querySelector('.euiStat__title')
        ?.textContent
    ).toEqual(`${mockKpiResponse.triggeredActions}`);
  });

  it('calls global KPI API if provided global rule id', async () => {
    renderWithI18n(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    await waitFor(() => {
      expect(loadGlobalExecutionKPIAggregations).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '*',
          message: undefined,
          outcomeFilter: undefined,
        })
      );
    });

    expect(loadExecutionKPIAggregationsMock).not.toHaveBeenCalled();
  });

  it('calls KPI API with filters', async () => {
    renderWithI18n(
      <RuleEventLogListKPI
        ruleId="123"
        dateStart="now-24h"
        dateEnd="now"
        message="test"
        outcomeFilter={['status: 123', 'test:456']}
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    await waitFor(() => {
      expect(loadExecutionKPIAggregationsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          message: 'test',
          outcomeFilter: ['status: 123', 'test:456'],
        })
      );
    });
  });

  it('Should call addDanger function when an the API throw an error', async () => {
    loadGlobalExecutionKPIAggregationsMock.mockRejectedValue({ body: { statusCode: 400 } });
    renderWithI18n(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    await waitFor(() => {
      expect(addDangerMock).toHaveBeenCalled();
    });
  });

  it('Should NOT call addDanger function when an the API throw a 413 error', async () => {
    loadGlobalExecutionKPIAggregationsMock.mockRejectedValue({ body: { statusCode: 413 } });
    renderWithI18n(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    await waitFor(() => {
      expect(loadGlobalExecutionKPIAggregationsMock).toHaveBeenCalled();
    });

    expect(addDangerMock).not.toHaveBeenCalled();
  });
});
