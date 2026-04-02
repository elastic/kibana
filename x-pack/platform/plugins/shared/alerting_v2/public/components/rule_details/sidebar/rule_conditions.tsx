/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { ItemValueRuleSummary } from '../item_value_rule_summary';
import { RecoveryPolicy } from '../recovery_policy';
import { EMPTY_VALUE, formatAlertDelay } from '../utils';

export interface RuleConditionsProps {
  rule: RuleApiResponse;
}

const MODE_LABELS: Record<string, string> = {
  signal: i18n.translate('xpack.alertingV2.ruleDetails.modeSignal', {
    defaultMessage: 'Detect only',
  }),
  alert: i18n.translate('xpack.alertingV2.ruleDetails.modeAlert', {
    defaultMessage: 'Alerting',
  }),
};

const NO_DATA_BEHAVIOR_LABELS: Record<string, string> = {
  no_data: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorNoData', {
    defaultMessage: 'No data',
  }),
  last_status: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorLastStatus', {
    defaultMessage: 'Keep last status',
  }),
  recover: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorRecover', {
    defaultMessage: 'Recover',
  }),
};

export const RuleConditions: React.FunctionComponent<RuleConditionsProps> = ({ rule }) => {
  const isAlertMode = rule.kind === 'alert';
  const dataSource = getIndexPatternFromESQLQuery(rule.evaluation?.query?.base) || EMPTY_VALUE;

  const conditionItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.dataSource', {
        defaultMessage: 'Data source',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsDataSource"
          itemValue={dataSource}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsGroupBy"
          itemValue={rule.grouping?.fields?.length ? rule.grouping.fields.join(', ') : EMPTY_VALUE}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.timeField', {
        defaultMessage: 'Time field',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsTimeField"
          itemValue={rule.time_field ?? EMPTY_VALUE}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsSchedule"
          itemValue={i18n.translate('xpack.alertingV2.ruleDetails.scheduleValue', {
            defaultMessage: 'Every {interval}',
            values: { interval: formatDuration(rule.schedule.every) },
          })}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.lookback', {
        defaultMessage: 'Lookback',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsLookback"
          itemValue={rule.schedule.lookback ? formatDuration(rule.schedule.lookback) : EMPTY_VALUE}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.mode', {
        defaultMessage: 'Mode',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsMode"
          itemValue={MODE_LABELS[rule.kind] ?? rule.kind}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.recovery', {
        defaultMessage: 'Recovery',
      }),
      description: <RecoveryPolicy recoveryPolicy={rule.recovery_policy} />,
    },
    ...(isAlertMode
      ? [
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.alertDelay', {
              defaultMessage: 'Alert delay',
            }),
            description: (
              <ItemValueRuleSummary
                data-test-subj="alertingV2RuleDetailsAlertDelay"
                itemValue={formatAlertDelay(rule.state_transition)}
              />
            ),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.noDataConfig', {
        defaultMessage: 'No data config',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsNoDataConfig"
          itemValue={
            rule.no_data?.behavior
              ? NO_DATA_BEHAVIOR_LABELS[rule.no_data.behavior] ?? rule.no_data.behavior
              : EMPTY_VALUE
          }
        />
      ),
    },
  ];

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.ruleDetails.esqlQuery', {
            defaultMessage: 'ES|QL query',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="esql"
        isCopyable
        overflowHeight={360}
        paddingSize="m"
        data-test-subj="alertingV2RuleDetailsBaseQuery"
      >
        {rule.evaluation?.query?.base || EMPTY_VALUE}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiDescriptionList
        compressed
        type="column"
        listItems={conditionItems}
        css={{ maxWidth: 600 }}
      />
    </>
  );
};
