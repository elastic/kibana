/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiPanel, EuiButton } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';

import { formattedTime } from './helpers';

import { ViewAgentsButton } from './view_agents_button';

export const UninstallInProgressActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  abortUninstall: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, abortUninstall, onClickViewAgents }) => {
  const [isAborting, setIsAborting] = useState(false);

  const onClickAbortUninstall = useCallback(async () => {
    try {
      setIsAborting(true);
      await abortUninstall(action);
    } finally {
      setIsAborting(false);
    }
  }, [action, abortUninstall]);

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText color="subdued" data-test-subj="uninstallPendingDescription">
            <p>
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.uninstallScheduledDescription"
                defaultMessage="Scheduled for "
              />
              <strong>{formattedTime(action.startTime!)}</strong>.
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText data-test-subj="uninstallPendingTitle">
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.uninstallPendingTitle"
                  defaultMessage="Uninstall pending: {nbAgents, plural, one {# agent} other {# agents}}"
                  values={{ nbAgents: action.nbAgentsActioned - action.nbAgentsAck }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <KbnWarningCallout
            announceOnMount
            size="m"
            data-test-subj="uninstallGracePeriodWarning"
            title={
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.uninstallGracePeriodWarning"
                defaultMessage="Cancel before {time}."
                values={{ time: formattedTime(action.startTime!) }}
              />
            }
            text={
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.uninstallGracePeriodWarningBody"
                defaultMessage="After this point, the uninstall cannot be cancelled and the agent is removed from its host."
              />
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <ViewAgentsButton action={action} onClickViewAgents={onClickViewAgents} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="danger"
                onClick={onClickAbortUninstall}
                isLoading={isAborting}
                data-test-subj="abortUninstallBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.cancelUninstallButton"
                  defaultMessage="Cancel uninstall"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
