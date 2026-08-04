/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { getBreachEsqlQuery, getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useRule } from '../rule_context';
import {
  EMPTY_VALUE,
  formatAlertDelay,
  formatNoDataStrategy,
  formatRecoveryDelay,
  formatRecoveryStrategy,
  getRecoverEsqlSegment,
} from '../utils';
import { RuleDetailsTable } from './rule_details_table';

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
  const recoveryCondition = getRecoverEsqlSegment(rule.query, rule.recovery_strategy);

  const conditionItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.dataSource', {
        defaultMessage: 'Data source',
      }),
      description: dataSource,
      'data-test-subj': 'alertingV2RuleDetailsDataSource',
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: rule.grouping?.fields?.length ? rule.grouping.fields.join(', ') : EMPTY_VALUE,
      'data-test-subj': 'alertingV2RuleDetailsGroupBy',
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.timeField', {
        defaultMessage: 'Time field',
      }),
      description: rule.time_field ?? EMPTY_VALUE,
      'data-test-subj': 'alertingV2RuleDetailsTimeField',
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: i18n.translate('xpack.alertingV2.ruleDetails.scheduleValue', {
        defaultMessage: 'Every {interval}',
        values: { interval: formatDuration(rule.schedule.every) },
      }),
      'data-test-subj': 'alertingV2RuleDetailsSchedule',
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.lookback', {
        defaultMessage: 'Lookback',
      }),
      description: rule.schedule.lookback ? formatDuration(rule.schedule.lookback) : EMPTY_VALUE,
      'data-test-subj': 'alertingV2RuleDetailsLookback',
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.mode', {
        defaultMessage: 'Mode',
      }),
      description: MODE_LABELS[rule.kind] ?? rule.kind,
      'data-test-subj': 'alertingV2RuleDetailsMode',
    },
    ...(isAlertMode && !isSummary
      ? [
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.alertDelay', {
              defaultMessage: 'Alert delay',
            }),
            description: formatAlertDelay(rule.state_transition),
            'data-test-subj': 'alertingV2RuleDetailsAlertDelay',
          },
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.recovery', {
              defaultMessage: 'Recovery',
            }),
            description: formatRecoveryStrategy(rule.recovery_strategy),
            'data-test-subj': 'alertingV2RuleDetailsRecovery',
          },
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.recoveryCondition', {
              defaultMessage: 'Recovery condition',
            }),
            description: recoveryCondition ? null : EMPTY_VALUE,
            'data-test-subj': 'alertingV2RuleDetailsRecoveryCondition',
            fullWidthContent: recoveryCondition ? (
              <EuiCodeBlock
                language="esql"
                isCopyable
                paddingSize="s"
                data-test-subj="alertingV2RuleDetailsRecoveryConditionQuery"
              >
                {recoveryCondition}
              </EuiCodeBlock>
            ) : null,
          },
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.recoveryDelay', {
              defaultMessage: 'Recovery delay',
            }),
            description: formatRecoveryDelay(rule.state_transition),
            'data-test-subj': 'alertingV2RuleDetailsRecoveryDelay',
          },
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehavior', {
              defaultMessage: 'No data behavior',
            }),
            description: formatNoDataStrategy(rule.no_data_strategy ?? 'none'),
            'data-test-subj': 'alertingV2RuleDetailsNoDataStrategy',
          },
        ]
      : []),
  ];

  // The summary flyout renders the description in its header.
  const description = isSummary ? undefined : rule.metadata.description;

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
      {description && (
        <>
          <EuiText size="s" data-test-subj="ruleConditionsDescription">
            <p>{description}</p>
          </EuiText>
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

      <EuiSpacer size="s" />

      <RuleDetailsTable items={conditionItems} />
    </>
  );
};
