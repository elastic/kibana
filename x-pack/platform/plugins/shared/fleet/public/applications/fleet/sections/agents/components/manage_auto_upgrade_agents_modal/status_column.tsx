/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useGetAutoUpgradeAgentsStatusQuery, useLink } from '../../../../../../hooks';
export const StatusColumn: React.FunctionComponent<{
  agentPolicyId: string;
  version: string;
  percentage: number;
}> = ({ agentPolicyId, version, percentage }) => {
  const { getHref } = useLink();
  const { data: autoUpgradeAgentsStatus } = useGetAutoUpgradeAgentsStatusQuery(agentPolicyId);
  const getAgentsHref = useCallback(
    (failed?: boolean): string => {
      const kuery = failed
        ? `policy_id:"${agentPolicyId}" AND upgrade_details.state:"UPG_FAILED" AND upgrade_details.target_version:"${version}"`
        : `policy_id:"${agentPolicyId}" AND agent.version:"${version}"`;
      return getHref('agent_list', {
        kuery: encodeURIComponent(kuery),
      });
    },
    [getHref, agentPolicyId, version]
  );

  const calcPercentage = useCallback(
    (agents: number): number =>
      autoUpgradeAgentsStatus && autoUpgradeAgentsStatus.totalAgents > 0
        ? Math.round((agents / autoUpgradeAgentsStatus.totalAgents) * 100)
        : 0,
    [autoUpgradeAgentsStatus]
  );

  const agentVersionCounts = useMemo(() => {
    return (
      autoUpgradeAgentsStatus?.currentVersions.find((value) => value.version === version) ?? {
        version,
        agents: 0,
        failedUpgradeAgents: 0,
      }
    );
  }, [autoUpgradeAgentsStatus, version]);

  const currentPercentage = useMemo(() => {
    const result = calcPercentage(agentVersionCounts.agents);
    return `${result}%`;
  }, [agentVersionCounts, calcPercentage]);

  const currentStatus = useMemo(() => {
    const inProgressStatus = (
      <EuiButtonEmpty size="s" href={getAgentsHref(false)} color="text">
        <EuiIcon type="clock" />{' '}
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.inProgressText"
          defaultMessage="In progress"
        />
      </EuiButtonEmpty>
    );
    const failedStatus = (
      <EuiButtonEmpty size="s" href={getAgentsHref(true)} color="text">
        <EuiIcon type="errorFilled" color="danger" />{' '}
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.failedText"
          defaultMessage="Upgrade failed"
        />
      </EuiButtonEmpty>
    );
    const completedStatus = (
      <EuiButtonEmpty size="s" href={getAgentsHref(false)} color="text">
        <EuiIcon type="checkInCircleFilled" color="success" />{' '}
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.completedText"
          defaultMessage="Completed"
        />
      </EuiButtonEmpty>
    );
    const notStartedStatus = (
      <EuiButtonEmpty size="s" color="text">
        <EuiIcon type="minusInCircle" color="text" />{' '}
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.notStartedText"
          defaultMessage="Not started"
        />
      </EuiButtonEmpty>
    );
    let statusButton = inProgressStatus;

    if (agentVersionCounts.failedUpgradeAgents > 0) {
      statusButton = failedStatus;
    } else if (agentVersionCounts.agents === 0) {
      statusButton = notStartedStatus;
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
          agentVersionCounts.agents > 0 ? (
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.currentStatusTooltip"
              defaultMessage="{agents, plural, one {# agent} other {# agents}} on target version"
              values={{
                agents: agentVersionCounts.agents,
              }}
            />
          ) : agentVersionCounts.failedUpgradeAgents > 0 ? (
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.failedStatusTooltip"
              defaultMessage="{failedUpgradeAgents} agents failed to upgrade"
              values={{
                failedUpgradeAgents: agentVersionCounts.failedUpgradeAgents,
              }}
            />
          ) : null
        }
      >
        {statusButton}
      </EuiToolTip>
    );
  }, [agentVersionCounts, percentage, calcPercentage, getAgentsHref]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexStart">
      <EuiFlexItem grow={1}>
        <EuiText size="s">{currentPercentage}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem component="span" grow={4}>
        {currentStatus}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
