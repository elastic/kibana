/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionGroup, ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleEventLogList, RuleEventLogListProps } from './rule_event_log_list';
import { mockRule, mockRuleType, mockRuleSummary, mockLogResponse } from './test_helpers';
import { RuleType } from '../../../../types';
import { loadActionErrorLog } from '../../../lib/rule_api/load_action_error_log';
import { getJsDomPerformanceFix } from '../../test_utils';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));
jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../hooks/use_load_rule_event_logs', () => ({
  useLoadRuleEventLogs: jest.fn(),
}));

const { getIsExperimentalFeatureEnabled } = jest.requireMock(
  '../../../../common/get_experimental_features'
);
const { useLoadRuleEventLogs } = jest.requireMock('../../../hooks/use_load_rule_event_logs');

const RuleEventLogListWithProvider = (props: RuleEventLogListProps<'stackManagement'>) => {
  return (
    <IntlProvider locale="en">
      <RuleEventLogList {...props} />
    </IntlProvider>
  );
};

const loadActionErrorLogMock = loadActionErrorLog as unknown as jest.MockedFunction<
  typeof loadActionErrorLog
>;
const ruleMock = mockRule();

const authorizedConsumers = {
  [ALERTING_FEATURE_ID]: { read: true, all: true },
};

const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const ruleType: RuleType = mockRuleType({
  producer: ALERTING_FEATURE_ID,
  authorizedConsumers,
  recoveryActionGroup,
});

const mockErrorLogResponse = {
  totalErrors: 1,
  errors: [
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac1d',
      timestamp: '2022-03-31T18:03:33.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
  ],
};

const onChangeDurationMock = jest.fn();

const { fix, cleanup: cleanupJsDomePerformanceFix } = getJsDomPerformanceFix();

beforeAll(() => {
  fix();
});

afterAll(() => {
  cleanupJsDomePerformanceFix();
});

const mockLoadEventLog = jest.fn();
describe('rule_event_log_list', () => {
  beforeEach(() => {
    getIsExperimentalFeatureEnabled.mockImplementation(() => true);
    useKibanaMock().services.uiSettings.get = jest.fn().mockImplementation((value: string) => {
      if (value === 'timepicker:quickRanges') {
        return [
          {
            from: 'now-15m',
            to: 'now',
            display: 'Last 15 minutes',
          },
        ];
      }
    });
    loadActionErrorLogMock.mockResolvedValue(mockErrorLogResponse);
    useLoadRuleEventLogs.mockReturnValue({
      data: mockLogResponse,
      isLoading: false,
      loadEventLogs: mockLoadEventLog,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('shows rule summary and execution duration chart', async () => {
    render(
      <RuleEventLogListWithProvider
        fetchRuleSummary={false}
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
      />
    );

    const avgExecutionDurationPanel = screen.getByTestId('avgExecutionDurationPanel');

    await waitFor(() => {
      expect(avgExecutionDurationPanel.textContent).toEqual('Average duration00:00:00.100');
      expect(screen.queryByTestId('ruleDurationWarning')).not.toBeInTheDocument();
      expect(screen.getByTestId('executionDurationChartPanel')).toBeInTheDocument();
      expect(screen.getByTestId('avgExecutionDurationPanel')).toBeInTheDocument();
      expect(screen.getByTestId('ruleEventLogListAvgDuration').textContent).toEqual('00:00:00.100');
    });
  });

  it('renders average execution duration', async () => {
    const ruleTypeCustom = mockRuleType({ ruleTaskTimeout: '10m' });
    const ruleSummary = mockRuleSummary({
      executionDuration: { average: 60284, valuesWithTimestamp: {} },
      ruleTypeId: ruleMock.ruleTypeId,
    });

    render(
      <RuleEventLogListWithProvider
        fetchRuleSummary={false}
        ruleId={ruleMock.id}
        ruleType={ruleTypeCustom}
        ruleSummary={ruleSummary}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
      />
    );

    const avgExecutionDurationPanel = screen.getByTestId('avgExecutionDurationPanel');

    await waitFor(() => {
      expect(avgExecutionDurationPanel.textContent).toEqual('Average duration00:01:00.284');
      expect(screen.queryByTestId('ruleDurationWarning')).not.toBeInTheDocument();
    });
  });

  it('renders warning when average execution duration exceeds rule timeout', async () => {
    const ruleTypeCustom = mockRuleType({ ruleTaskTimeout: '10m' });
    const ruleSummary = mockRuleSummary({
      executionDuration: { average: 60284345, valuesWithTimestamp: {} },
      ruleTypeId: ruleMock.ruleTypeId,
    });

    useLoadRuleEventLogs.mockReturnValue({
      data: {
        ...mockLogResponse,
        total: 85,
      },
      isLoading: false,
      loadEventLogs: mockLoadEventLog,
    });

    render(
      <RuleEventLogListWithProvider
        fetchRuleSummary={false}
        ruleId={ruleMock.id}
        ruleType={ruleTypeCustom}
        ruleSummary={ruleSummary}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('ruleEventLogListAvgDuration').textContent).toEqual('16:44:44.345');
      expect(screen.getByTestId('ruleDurationWarning')).toBeInTheDocument();
    });
  });
});
