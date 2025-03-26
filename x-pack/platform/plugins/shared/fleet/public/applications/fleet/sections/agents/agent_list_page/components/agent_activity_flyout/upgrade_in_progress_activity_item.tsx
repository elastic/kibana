/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiIcon,
  EuiText,
  EuiPanel,
  EuiButton,
  EuiLink,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';
import { useStartServices, useGetAutoUpgradeAgentsStatusQuery } from '../../../../../hooks';

import {
  automaticUpgradeTitle,
  formattedTime,
  inProgressDescription,
  inProgressTitle,
} from './helpers';

import { ViewAgentsButton } from './view_agents_button';

export const UpgradeInProgressActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
  onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}> = ({ action, abortUpgrade, onClickViewAgents, onClickManageAutoUpgradeAgents }) => {
  // get the total agents in policy from the policy id
  const { data: autoUpgradeAgentsStatus } = useGetAutoUpgradeAgentsStatusQuery(
    action.policyId ?? ''
  );
  const totalAgentsInPolicy = autoUpgradeAgentsStatus?.totalAgents ?? null;
  console.log('total agents in policy', autoUpgradeAgentsStatus);
  const { docLinks } = useStartServices();
  const theme = useEuiTheme();
  const isAutomaticUpgrade = action.is_automatic;
  const [isAborting, setIsAborting] = useState(false);
  const onClickAbortUpgrade = useCallback(async () => {
    try {
      setIsAborting(true);
      await abortUpgrade(action);
    } finally {
      setIsAborting(false);
    }
  }, [action, abortUpgrade]);

  const isScheduled = useMemo(() => {
    if (!action.startTime) {
      return false;
    }
    const now = Date.now();
    const startDate = new Date(action.startTime).getTime();

    return startDate > now;
  }, [action]);

  const showCancelButton = useMemo(() => {
    return isScheduled || action.hasRolloutPeriod;
  }, [action, isScheduled]);

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText color="subdued" data-test-subj="upgradeInProgressDescription">
            <p>
              {isScheduled && action.startTime ? (
                <>
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.scheduledDescription"
                    defaultMessage="Scheduled for "
                  />
                  <strong>{formattedTime(action.startTime)}</strong>.&nbsp;
                </>
              ) : (
                <>{inProgressDescription(action.creationTime)}&nbsp;</>
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {isAutomaticUpgrade ? (
            automaticUpgradeTitle(action, totalAgentsInPolicy ?? 0)
          ) : (
            <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
              <EuiFlexItem grow={false}>
                {isScheduled ? (
                  <EuiIcon type="clock" />
                ) : !isAutomaticUpgrade ? (
                  <EuiLoadingSpinner size="m" />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  color={theme.euiTheme.colors.textPrimary}
                  data-test-subj="upgradeInProgressTitle"
                >
                  {isScheduled && action.startTime ? (
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.scheduleTitle"
                      defaultMessage="{nbAgents} agents scheduled to upgrade to version {version}"
                      values={{
                        nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
                        version: action.version,
                      }}
                    />
                  ) : (
                    inProgressTitle(action, totalAgentsInPolicy ?? 0)
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" alignItems="flexStart">
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <ViewAgentsButton action={action} onClickViewAgents={onClickViewAgents} />
              </EuiFlexItem>
              {isAutomaticUpgrade && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => onClickManageAutoUpgradeAgents(action)}
                    size="m"
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.manageAutoUpgradeAgents"
                      defaultMessage="Manage auto-upgrade agents"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiButtonEmpty>
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.learnMore"
                    defaultMessage="{value}"
                    values={{
                      value: (
                        <EuiLink href={docLinks.links.fleet.upgradeElasticAgent} target="_blank">
                          <FormattedMessage
                            id="xpack.fleet.agentActivityFlyout.guideLink"
                            defaultMessage="Learn more"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFlexItem grow={false}>
              {showCancelButton ? (
                <EuiButton
                  size="s"
                  onClick={onClickAbortUpgrade}
                  isLoading={isAborting}
                  data-test-subj="abortBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.abortUpgradeButtom"
                    defaultMessage="Cancel"
                  />
                </EuiButton>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
