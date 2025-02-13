/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useGetAutoUpgradeAgentsStatusQuery } from '../../../../../../hooks';

export const StatusColumn: React.FunctionComponent<{
  agentPolicyId: string;
  version: string;
  percentage: number;
}> = ({ agentPolicyId, version, percentage }) => {
  const { data: currentVersionCounts } = useGetAutoUpgradeAgentsStatusQuery(agentPolicyId);

  const calcPercentage = useCallback(
    (agents: number): number =>
      currentVersionCounts ? Math.round((agents / currentVersionCounts.totalAgents) * 100) : 0,
    [currentVersionCounts]
  );

  const currentPercentage = useMemo(() => {
    let result = 0;
    if (currentVersionCounts) {
      const currentVersion = currentVersionCounts.currentVersions.find(
        (value) => value.version === version
      );
      if (currentVersion) {
        result = calcPercentage(currentVersion.agents);
      }
    }
    return `${result}%`;
  }, [currentVersionCounts, version, calcPercentage]);

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
    if (!currentVersionCounts) return inProgressStatus;
    const currentVersion = currentVersionCounts.currentVersions.find(
      (value) => value.version === version
    );
    if (currentVersion) {
      if (currentVersion.failedAgents > 0) {
        return failedStatus;
      }
      const currPercentage = calcPercentage(currentVersion.agents);
      if (currPercentage >= percentage) {
        return completedStatus;
      } else {
        return inProgressStatus;
      }
    }
    return inProgressStatus;
  }, [currentVersionCounts, version, percentage, calcPercentage]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s">{currentPercentage}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem component="span">{currentStatus}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
