/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useGetAutoUpgradeAgentsStatusQuery } from '../../../../../../hooks';

export const StatusColumn: React.FunctionComponent<{
  agentPolicyId: string;
  version: string;
  percentage: number;
}> = ({ agentPolicyId, version, percentage }) => {
  const { data: autoUpgradeAgentsStatus } = useGetAutoUpgradeAgentsStatusQuery(agentPolicyId);

  const calcPercentage = useCallback(
    (agents: number): number =>
      autoUpgradeAgentsStatus
        ? Math.round((agents / autoUpgradeAgentsStatus.totalAgents) * 100)
        : 0,
    [autoUpgradeAgentsStatus]
  );

  const agentVersionCounts = useMemo(() => {
    return (
      autoUpgradeAgentsStatus?.currentVersions.find((value) => value.version === version) ?? {
        version,
        agents: 0,
        failedAgents: 0,
      }
    );
  }, [autoUpgradeAgentsStatus, version]);

  const currentPercentage = useMemo(() => {
    const result = calcPercentage(agentVersionCounts.agents);
    return `${result}%`;
  }, [agentVersionCounts, calcPercentage]);

  const currentStatus = useMemo(() => {
    const inProgressStatus = (
      <EuiButtonEmpty size="s" iconType="clock">
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.inProgressText"
          defaultMessage="In progress"
        />
      </EuiButtonEmpty>
    );
    const failedStatus = (
      <EuiButtonEmpty size="s" iconType="errorFilled" color="danger" href="#">
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.failedText"
          defaultMessage="Upgrade failed"
        />
      </EuiButtonEmpty>
    );
    const completedStatus = (
      <EuiButtonEmpty size="s" iconType="checkInCircleFilled" color="success">
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.completedText"
          defaultMessage="Completed"
        />
      </EuiButtonEmpty>
    );
    let statusButton = inProgressStatus;

    if (agentVersionCounts.failedAgents > 0) {
      statusButton = failedStatus;
    } else {
      const currPercentage = calcPercentage(agentVersionCounts.agents);
      if (currPercentage >= percentage) {
        statusButton = completedStatus;
      } else {
        statusButton = inProgressStatus;
      }
    }

    return (
      <EuiToolTip
        content={
          agentVersionCounts.failedAgents === 0 ? (
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.currentStatusTooltip"
              defaultMessage="{agents} agents on target version"
              values={{
                agents: agentVersionCounts.agents,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.failedStatusTooltip"
              defaultMessage="{failedAgents} agents failed to upgrade"
              values={{
                agents: agentVersionCounts.agents,
                failedAgents: agentVersionCounts.failedAgents,
              }}
            />
          )
        }
      >
        {statusButton}
      </EuiToolTip>
    );
  }, [agentVersionCounts, percentage, calcPercentage]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s">{currentPercentage}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem component="span">{currentStatus}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
