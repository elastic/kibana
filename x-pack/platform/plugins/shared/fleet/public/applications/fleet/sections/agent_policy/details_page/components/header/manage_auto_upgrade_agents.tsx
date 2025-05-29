/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';

import type { AgentPolicy } from '../../../../../types';
import { useGetAutoUpgradeAgentsStatusQuery } from '../../../../../hooks';

export interface Props {
  agentPolicy: AgentPolicy;
  isManageAutoUpgradeAgentsModalOpen: boolean;
  setIsManageAutoUpgradeAgentsModalOpen: (isOpen: boolean) => void;
}

export const ManageAutoUpgradeAgentsBadge: React.FC<Props> = ({
  agentPolicy,
  isManageAutoUpgradeAgentsModalOpen,
  setIsManageAutoUpgradeAgentsModalOpen,
}: Props) => {
  const { data: autoUpgradeAgentsStatus } = useGetAutoUpgradeAgentsStatusQuery(agentPolicy.id);
  const requiredVersions = (agentPolicy.required_versions ?? []).map(
    (reqVersion) => reqVersion.version
  );
  const hasErrors = useMemo(() => {
    return autoUpgradeAgentsStatus?.currentVersions
      .filter((value) => requiredVersions.includes(value.version))
      .some((value) => value.failedUpgradeAgents > 0);
  }, [autoUpgradeAgentsStatus, requiredVersions]);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      justifyContent="flexEnd"
      alignItems="center"
      id="auto-upgrade-manage-button"
    >
      <EuiFlexItem grow={false}>
        <EuiLink
          onClick={() => {
            setIsManageAutoUpgradeAgentsModalOpen(!isManageAutoUpgradeAgentsModalOpen);
          }}
        >
          <FormattedMessage
            id="xpack.fleet.policyDetails.summary.autoUpgradeButton"
            defaultMessage="Manage"
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge color={agentPolicy.required_versions?.length ? 'accent' : 'subdued'}>
          {agentPolicy.required_versions?.length || 0}
        </EuiNotificationBadge>
      </EuiFlexItem>
      {hasErrors && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.fleet.manageAutoUpgradeAgents.failedUpgradeTooltip"
                defaultMessage="Some agents failed to upgrade, click on Manage to see details."
              />
            }
          >
            <EuiIcon type="warning" color="danger" />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
