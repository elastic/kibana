/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { ActionGroup } from '@kbn/alerting-plugin/common';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { RuleExecutionSummaryAndChart } from './rule_execution_summary_and_chart';
import { useKibana } from '../../../../common/lib/kibana';
import { mockRule, mockRuleType, mockRuleSummary } from './test_helpers';
import type { RuleType } from '../../../../types';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

const loadRuleSummaryMock = jest.fn();

const onChangeDurationMock = jest.fn();

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

describe('rule_execution_summary_and_chart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadRuleSummaryMock.mockResolvedValue(mockRuleSummary());
  });

  it('becomes a stateless component when "fetchRuleSummary" is false', async () => {
    renderWithI18n(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary()}
        numberOfExecutions={60}
        isLoadingRuleSummary={false}
        onChangeDuration={onChangeDurationMock}
        fetchRuleSummary={false}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    // Does not fetch for the rule summary by itself
    expect(loadRuleSummaryMock).toHaveBeenCalledTimes(0);

    // Simulate change on duration select
    const select = screen.getByTestId('executionDurationChartPanelSelect');
    await userEvent.selectOptions(select, '30');

    // Calls the handler passed in via props
    expect(onChangeDurationMock).toHaveBeenCalledWith(30);

    expect(screen.getByTestId('avgExecutionDurationPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleDurationWarning')).not.toBeInTheDocument();
    expect(screen.getByTestId('executionDurationChartPanel')).toBeInTheDocument();
    expect(screen.getByTestId('ruleEventLogListAvgDuration')).toHaveTextContent('00:00:00.100');
  });

  it('becomes a container component when "fetchRuleSummary" is true', async () => {
    renderWithI18n(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        fetchRuleSummary={true}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    // Fetches the rule summary by itself
    await waitFor(() => {
      expect(loadRuleSummaryMock).toHaveBeenCalledTimes(1);
    });

    // Simulate change on duration select — but onChangeDurationMock is not passed so should not be called
    const select = screen.getByTestId('executionDurationChartPanelSelect');
    await userEvent.selectOptions(select, '30');

    // onChangeDuration not provided so mock should not be called
    expect(onChangeDurationMock).toHaveBeenCalledTimes(0);

    await screen.findByTestId('avgExecutionDurationPanel');

    expect(screen.queryByTestId('ruleDurationWarning')).not.toBeInTheDocument();
    expect(screen.getByTestId('executionDurationChartPanel')).toBeInTheDocument();
    expect(screen.getByTestId('ruleEventLogListAvgDuration')).toHaveTextContent('00:00:00.100');
  });

  it('should show error if loadRuleSummary fails', async () => {
    loadRuleSummaryMock.mockRejectedValue('error!');

    renderWithI18n(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        fetchRuleSummary={true}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    await waitFor(() => {
      expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalled();
    });
  });
});
