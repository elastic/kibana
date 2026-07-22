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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MOCK_DATA = {
  totalExecutions: 12_847,
  ruleExecutions: 9_421,
  policyExecutions: 3_426,
  failedExecutions: 342,
  failedRules: 5,
  failedPolicies: 3,
  failureRate: '2.7%',
};

export const ExecutionKpis: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisExecutionsPanel">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.executionHistory.kpis.executionsTitle', {
                defaultMessage: 'All executions',
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
                title={MOCK_DATA.ruleExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.ruleExecutions',
                  { defaultMessage: 'Rules' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.policyExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.policyExecutions',
                  { defaultMessage: 'Action policies' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisFailuresPanel">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.executionHistory.kpis.failuresTitle', {
                defaultMessage: 'Failures',
              })}
            </h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failedTotal',
                  { defaultMessage: 'Total failed' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedRules}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failingRules',
                  { defaultMessage: 'Failing rules' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failedPolicies}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failingPolicies',
                  { defaultMessage: 'Failing policies' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_DATA.failureRate}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failureRate',
                  { defaultMessage: 'Failure rate' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
