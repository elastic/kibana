/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiTitle,
  EuiListGroup,
  type EuiListGroupProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MOCK_DATA = {
  totalExecutions: 12_847,
  failedExecutions: 342,
  failedPercentage: '2.7%',
  failedRules: 5,
  failedPolicies: 3,
  failedByType: '1.2%',
  topFailingRules: [
    { label: 'High CPU alert', id: '1' },
    { label: 'Memory threshold', id: '2' },
    { label: 'Disk usage monitor', id: '3' },
    { label: 'Network latency', id: '4' },
    { label: 'Error rate spike', id: '5' },
  ],
  topFailingPolicies: [
    { label: 'Slack notifications', id: '1' },
    { label: 'PagerDuty escalation', id: '2' },
    { label: 'Email digest', id: '3' },
  ],
};

export const ExecutionKpis: React.FC = () => {
  const topRulesItems: EuiListGroupProps['listItems'] = MOCK_DATA.topFailingRules.map((r) => ({
    key: r.id,
    label: r.label,
    size: 's' as const,
    onClick: () => {},
  }));

  const topPoliciesItems: EuiListGroupProps['listItems'] = MOCK_DATA.topFailingPolicies.map(
    (p) => ({
      key: p.id,
      label: p.label,
      size: 's' as const,
      onClick: () => {},
    })
  );

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisExecutionsPanel">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.executionHistory.kpis.executionsTitle', {
                defaultMessage: 'Executions',
              })}
            </h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.totalExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.totalExecutions',
                  { defaultMessage: 'Total' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failedExecutions',
                  { defaultMessage: 'Failed' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedPercentage}
                description={i18n.translate('xpack.alertingV2.executionHistory.kpis.failedRate', {
                  defaultMessage: 'Failure rate',
                })}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisFailingResourcesPanel">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.executionHistory.kpis.failingResourcesTitle', {
                defaultMessage: 'Failing resources',
              })}
            </h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedRules}
                description={i18n.translate('xpack.alertingV2.executionHistory.kpis.failedRules', {
                  defaultMessage: 'Rules',
                })}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedPolicies}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failedPolicies',
                  { defaultMessage: 'Action policies' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedByType}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failedByType',
                  { defaultMessage: 'By execution type' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisTopFailingPanel">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.executionHistory.kpis.topFailingTitle', {
                defaultMessage: 'Top failing',
              })}
            </h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h4>
                  {i18n.translate('xpack.alertingV2.executionHistory.kpis.topFailingRules', {
                    defaultMessage: 'Rules',
                  })}
                </h4>
              </EuiTitle>
              <EuiListGroup listItems={topRulesItems} maxWidth={false} flush />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h4>
                  {i18n.translate('xpack.alertingV2.executionHistory.kpis.topFailingPolicies', {
                    defaultMessage: 'Action policies',
                  })}
                </h4>
              </EuiTitle>
              <EuiListGroup listItems={topPoliciesItems} maxWidth={false} flush />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
