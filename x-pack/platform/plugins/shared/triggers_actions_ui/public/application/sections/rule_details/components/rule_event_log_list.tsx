/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { RuleExecutionSummaryAndChartWithApi } from './rule_execution_summary_and_chart';

import { RuleSummary, RuleType } from '../../../../types';
import { ComponentOpts as RuleApis } from '../../common/components/with_bulk_rule_api_operations';
import { RuleEventLogListTable } from './rule_event_log_list_table';
import { RefreshToken } from './types';

const RULE_EVENT_LOG_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleEventLogList.initialColumns';

const ruleEventListContainerStyle = { minHeight: 400 };

export type RuleEventLogListOptions = 'stackManagement' | 'default';

export interface RuleEventLogListCommonProps {
  ruleId: string;
  ruleType: RuleType;
  localStorageKey?: string;
  refreshToken?: RefreshToken;
  requestRefresh?: () => Promise<void>;
  loadExecutionLogAggregations?: RuleApis['loadExecutionLogAggregations'];
  fetchRuleSummary?: boolean;
  hideChart?: boolean;
}

export interface RuleEventLogListStackManagementProps {
  ruleSummary: RuleSummary;
  onChangeDuration: (duration: number) => void;
  numberOfExecutions: number;
  isLoadingRuleSummary?: boolean;
}

export type RuleEventLogListProps<T extends RuleEventLogListOptions = 'default'> =
  T extends 'default'
    ? RuleEventLogListCommonProps
    : T extends 'stackManagement'
    ? RuleEventLogListStackManagementProps & RuleEventLogListCommonProps
    : never;

export const RuleEventLogList = <T extends RuleEventLogListOptions>(
  props: RuleEventLogListProps<T>
) => {
  const {
    ruleId,
    ruleType,
    localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY,
    refreshToken,
    requestRefresh,
    fetchRuleSummary = true,
  } = props;

  const {
    ruleSummary,
    numberOfExecutions,
    onChangeDuration,
    isLoadingRuleSummary = false,
  } = props as RuleEventLogListStackManagementProps;
  return (
    <div style={ruleEventListContainerStyle} data-test-subj="ruleEventLogListContainer">
      <EuiSpacer />
      <RuleExecutionSummaryAndChartWithApi
        ruleId={ruleId}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        numberOfExecutions={numberOfExecutions}
        isLoadingRuleSummary={isLoadingRuleSummary}
        refreshToken={refreshToken}
        onChangeDuration={onChangeDuration}
        requestRefresh={requestRefresh}
        fetchRuleSummary={fetchRuleSummary}
      />
      <EuiSpacer />
      <RuleEventLogListTable
        localStorageKey={localStorageKey}
        ruleId={ruleId}
        refreshToken={refreshToken}
      />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleEventLogList as default };
