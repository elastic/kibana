/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleHealth, RuleHealthErrorMessage } from '../../../lib/rule_api/health';
import type { RuleHealthSelection } from '../lib/rule_health_filters';
import { isSameRuleHealthSelection } from '../lib/rule_health_filters';
import { RuleHealthBreakdownList } from './rule_health_breakdown_list';
import {
  API_KEY_ERROR_LABEL,
  FAILED_RULES_LABEL,
  FAILURES_BY_REASON_TITLE,
  HEALTHY_RULES_LABEL,
  MESSAGE_COLUMN_TITLE,
  MISSING_API_KEY_LABEL,
  NO_ERROR_MESSAGES_MESSAGE,
  NO_FAILURES_MESSAGE,
  NO_WARNINGS_MESSAGE,
  REASON_COLUMN_TITLE,
  RULES_COLUMN_TITLE,
  TOP_ERROR_MESSAGES_TITLE,
  TOTAL_RULES_LABEL,
  WARNING_RULES_LABEL,
  WARNINGS_BY_REASON_TITLE,
  getErrorReasonLabel,
  getWarningReasonLabel,
} from '../translations';

export interface RuleHealthOverviewProps {
  health?: RuleHealth;
  isLoading: boolean;
  selection: RuleHealthSelection;
  onSelectionChange: (selection: RuleHealthSelection) => void;
}

const EMPTY_HEALTH: RuleHealth = {
  total: 0,
  byOutcome: {},
  byStatus: {},
  byErrorReason: [],
  byWarningReason: [],
  topErrorMessages: [],
  apiKeyError: { count: 0, messages: [] },
  missingApiKey: { count: 0 },
};

export const RuleHealthOverview = ({
  health = EMPTY_HEALTH,
  isLoading,
  selection,
  onSelectionChange,
}: RuleHealthOverviewProps) => {
  const { euiTheme } = useEuiTheme();
  const isSelected = (candidate: RuleHealthSelection) =>
    isSameRuleHealthSelection(selection, candidate);
  const toggle = (candidate: RuleHealthSelection) =>
    onSelectionChange(isSelected(candidate) ? { type: 'problems' } : candidate);

  const failed = health.byOutcome.failed ?? 0;
  const warning = health.byOutcome.warning ?? 0;
  const succeeded = health.byOutcome.succeeded ?? 0;
  const missingApiKey = health.missingApiKey.count;
  const apiKeyError = health.apiKeyError.count;

  const stats: Array<{
    key: string;
    title: number;
    description: string;
    color: string;
    selection?: RuleHealthSelection;
    testSubj: string;
  }> = [
    {
      key: 'total',
      title: health.total,
      description: TOTAL_RULES_LABEL,
      color: euiTheme.colors.textParagraph,
      testSubj: 'ruleHealthStat-total',
    },
    {
      key: 'failed',
      title: failed,
      description: FAILED_RULES_LABEL,
      color: euiTheme.colors.danger,
      selection: { type: 'outcome', outcome: 'failed' },
      testSubj: 'ruleHealthStat-failed',
    },
    {
      key: 'warning',
      title: warning,
      description: WARNING_RULES_LABEL,
      color: euiTheme.colors.warning,
      selection: { type: 'outcome', outcome: 'warning' },
      testSubj: 'ruleHealthStat-warning',
    },
    {
      key: 'succeeded',
      title: succeeded,
      description: HEALTHY_RULES_LABEL,
      color: euiTheme.colors.success,
      selection: { type: 'outcome', outcome: 'succeeded' },
      testSubj: 'ruleHealthStat-succeeded',
    },
    {
      key: 'apiKeyError',
      title: apiKeyError,
      description: API_KEY_ERROR_LABEL,
      color: apiKeyError > 0 ? euiTheme.colors.danger : euiTheme.colors.textSubdued,
      selection: { type: 'apiKeyError', messages: health.apiKeyError.messages },
      testSubj: 'ruleHealthStat-apiKeyError',
    },
    {
      key: 'missingApiKey',
      title: missingApiKey,
      description: MISSING_API_KEY_LABEL,
      color: missingApiKey > 0 ? euiTheme.colors.warning : euiTheme.colors.textSubdued,
      selection: { type: 'missingApiKey' },
      testSubj: 'ruleHealthStat-missingApiKey',
    },
  ];

  const errorColumns: Array<EuiBasicTableColumn<RuleHealthErrorMessage>> = [
    {
      field: 'reason',
      name: REASON_COLUMN_TITLE,
      width: '160px',
      render: (reason: string) => getErrorReasonLabel(reason),
    },
    {
      field: 'message',
      name: MESSAGE_COLUMN_TITLE,
      truncateText: true,
      render: (message: string, item: RuleHealthErrorMessage) => {
        const candidate: RuleHealthSelection = {
          type: 'errorMessage',
          reason: item.reason,
          message: item.message,
        };
        return (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => toggle(candidate)}
            data-test-subj="ruleHealthErrorMessageLink"
            aria-pressed={isSelected(candidate)}
            title={message}
            css={{ maxWidth: '100%' }}
          >
            {isSelected(candidate) ? <strong>{message}</strong> : message}
          </EuiButtonEmpty>
        );
      },
    },
    {
      field: 'count',
      name: RULES_COLUMN_TITLE,
      width: '80px',
      align: 'right',
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="ruleHealthOverview">
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup gutterSize="l" responsive={false}>
            {stats.map(({ key, title, description, color, selection: statSelection, testSubj }) => (
              <EuiFlexItem key={key}>
                {statSelection ? (
                  <EuiPanel
                    hasShadow={false}
                    hasBorder={false}
                    paddingSize="s"
                    onClick={() => toggle(statSelection)}
                    aria-pressed={isSelected(statSelection)}
                    data-test-subj={`${testSubj}-button`}
                    css={{
                      borderBottom: `${euiTheme.border.width.thick} solid ${
                        isSelected(statSelection) ? color : 'transparent'
                      }`,
                    }}
                  >
                    <EuiStat
                      title={title}
                      description={description}
                      titleColor={color}
                      titleSize="m"
                      isLoading={isLoading}
                      data-test-subj={testSubj}
                    />
                  </EuiPanel>
                ) : (
                  <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
                    <EuiStat
                      title={title}
                      description={description}
                      titleColor={color}
                      titleSize="m"
                      isLoading={isLoading}
                      data-test-subj={testSubj}
                    />
                  </EuiPanel>
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <RuleHealthBreakdownList
              title={FAILURES_BY_REASON_TITLE}
              color="danger"
              emptyMessage={NO_FAILURES_MESSAGE}
              data-test-subj="ruleHealthErrorReasons"
              items={health.byErrorReason.map(({ reason, count }) => ({
                key: reason,
                label: getErrorReasonLabel(reason),
                count,
                isSelected: isSelected({ type: 'errorReason', reason }),
                onClick: () => toggle({ type: 'errorReason', reason }),
              }))}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <RuleHealthBreakdownList
              title={WARNINGS_BY_REASON_TITLE}
              color="warning"
              emptyMessage={NO_WARNINGS_MESSAGE}
              data-test-subj="ruleHealthWarningReasons"
              items={health.byWarningReason.map(({ reason, count }) => ({
                key: reason,
                label: getWarningReasonLabel(reason),
                count,
                isSelected: isSelected({ type: 'warningReason', reason }),
                onClick: () => toggle({ type: 'warningReason', reason }),
              }))}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleHealthTopErrorMessages">
          <EuiTitle size="xs">
            <h3>{TOP_ERROR_MESSAGES_TITLE}</h3>
          </EuiTitle>
          {health.topErrorMessages.length === 0 ? (
            <EuiText size="s" color="subdued">
              <p>{NO_ERROR_MESSAGES_MESSAGE}</p>
            </EuiText>
          ) : (
            <EuiBasicTable
              tableCaption={TOP_ERROR_MESSAGES_TITLE}
              items={health.topErrorMessages}
              columns={errorColumns}
              rowProps={{ 'data-test-subj': 'ruleHealthErrorMessageRow' }}
            />
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
