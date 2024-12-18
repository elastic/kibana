/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { loadExecutionKPIAggregations } from '../../../lib/rule_api/load_execution_kpi_aggregations';
import { loadGlobalExecutionKPIAggregations } from '../../../lib/rule_api/load_global_execution_kpi_aggregations';
import { RuleEventLogListKPI } from './rule_event_log_list_kpi';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib';
import { IToasts } from '@kbn/core/public';

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
    const wrapper = mountWithIntl(
      <RuleEventLogListKPI
        ruleId="123"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-successOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-warningOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-failureOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper.find('[data-test-subj="ruleEventLogKpi-activeAlerts"] .euiStat__title').first().text()
    ).toEqual('--');
    expect(
      wrapper.find('[data-test-subj="ruleEventLogKpi-newAlerts"] .euiStat__title').first().text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-recoveredAlerts"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-erroredActions"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-triggeredActions"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionKPIAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123',
        message: undefined,
        outcomeFilter: undefined,
      })
    );

    expect(loadGlobalExecutionKPIAggregations).not.toHaveBeenCalled();

    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-successOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.success}`);
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-warningOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.warning}`);
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-failureOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.failure}`);
    expect(
      wrapper.find('[data-test-subj="ruleEventLogKpi-activeAlerts"] .euiStat__title').first().text()
    ).toEqual(`${mockKpiResponse.activeAlerts}`);
    expect(
      wrapper.find('[data-test-subj="ruleEventLogKpi-newAlerts"] .euiStat__title').first().text()
    ).toEqual(`${mockKpiResponse.newAlerts}`);
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-recoveredAlerts"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.recoveredAlerts}`);
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-erroredActions"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.erroredActions}`);
    expect(
      wrapper
        .find('[data-test-subj="ruleEventLogKpi-triggeredActions"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.triggeredActions}`);
  });

  it('calls global KPI API if provided global rule id', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );
    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadGlobalExecutionKPIAggregations).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '*',
        message: undefined,
        outcomeFilter: undefined,
      })
    );

    expect(loadExecutionKPIAggregationsMock).not.toHaveBeenCalled();
  });

  it('calls KPI API with filters', async () => {
    const wrapper = mountWithIntl(
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

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionKPIAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123',
        message: 'test',
        outcomeFilter: ['status: 123', 'test:456'],
      })
    );
  });

  it('Should call addDanger function when an the API throw an error', async () => {
    loadGlobalExecutionKPIAggregationsMock.mockRejectedValue({ body: { statusCode: 400 } });
    const wrapper = mountWithIntl(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );
    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(addDangerMock).toHaveBeenCalled();
  });

  it('Should NOT call addDanger function when an the API throw a 413 error', async () => {
    loadGlobalExecutionKPIAggregationsMock.mockRejectedValue({ body: { statusCode: 413 } });
    const wrapper = mountWithIntl(
      <RuleEventLogListKPI
        ruleId="*"
        dateStart="now-24h"
        dateEnd="now"
        loadExecutionKPIAggregations={loadExecutionKPIAggregationsMock}
        loadGlobalExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );
    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(addDangerMock).not.toHaveBeenCalled();
  });
});
