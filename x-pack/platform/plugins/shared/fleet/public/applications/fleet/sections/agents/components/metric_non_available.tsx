/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy } from '../../../types';

export const MetricNonAvailable: React.FC<{ agentPolicy?: AgentPolicy }> = ({ agentPolicy }) => {
  const isMonitoringEnabled = agentPolicy?.monitoring_enabled?.includes('metrics');

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          N/A
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="iInCircle"
          content={
            !isMonitoringEnabled ? (
              <FormattedMessage
                id="xpack.fleet.agent.metricsNotAvailableMonitoringNotEnabled"
                defaultMessage="Agent monitoring is not enabled for this agent policy. Visit agent policy settings to enable monitoring."
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.metricsNotAvailableOtherReason"
                defaultMessage="That metric is not available, you may not have the correct permission to retrieve them."
              />
            )
          }
          color="subdued"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
