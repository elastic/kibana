/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { getBreachEsqlQuery, getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ItemValueRuleSummary } from '../item_value_rule_summary';
import { useRule } from '../rule_context';
import { EMPTY_VALUE, formatAlertDelay, formatRecoveryDelay } from '../utils';

const MODE_LABELS: Record<string, string> = {
  signal: i18n.translate('xpack.alertingV2.ruleDetails.modeSignal', {
    defaultMessage: 'Signal',
  }),
  alert: i18n.translate('xpack.alertingV2.ruleDetails.modeAlert', {
    defaultMessage: 'Alert',
  }),
};

export interface RuleConditionsProps {
  /**
   * `'full'` (default) shows all condition fields, matching the details page.
   * `'summary'` hides Alert delay and Recovery delay — used by the rule summary flyout.
   */
  variant?: 'full' | 'summary';
}

export const RuleConditions: React.FunctionComponent<RuleConditionsProps> = ({
  variant = 'full',
}) => {
  const rule = useRule();
  const isAlertMode = rule.kind === 'alert';
  const isSummary = variant === 'summary';
  const dataSource = getIndexPatternFromESQLQuery(getRootEsqlQuery(rule.query)) || EMPTY_VALUE;

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
    ...(isAlertMode && !isSummary
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
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.recoveryDelay', {
              defaultMessage: 'Recovery delay',
            }),
            description: (
              <ItemValueRuleSummary
                data-test-subj="alertingV2RuleDetailsRecoveryDelay"
                itemValue={formatRecoveryDelay(rule.state_transition)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {isSummary && (
        <>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDetails.conditions', {
                defaultMessage: 'Rule conditions',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
        </>
      )}
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
        {getBreachEsqlQuery(rule.query) || EMPTY_VALUE}
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
