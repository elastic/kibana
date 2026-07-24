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
  EuiIcon,
  EuiText,
  EuiPanel,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';

import { formattedTime, inProgressDescription, inProgressTitle } from './helpers';

import { ViewAgentsButton } from './view_agents_button';

export const UnenrollInProgressActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  abortUnenroll: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, abortUnenroll, onClickViewAgents }) => {
  const [isAborting, setIsAborting] = useState(false);

  const onClickAbortUnenroll = useCallback(async () => {
    try {
      setIsAborting(true);
      await abortUnenroll(action);
    } finally {
      setIsAborting(false);
    }
  }, [action, abortUnenroll]);

  const isScheduled = useMemo(() => {
    if (!action.startTime) return false;
    return new Date(action.startTime).getTime() > Date.now();
  }, [action]);

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText color="subdued" data-test-subj="unenrollInProgressDescription">
            <p>
              {isScheduled ? (
                <>
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.unenrollScheduledDescription"
                    defaultMessage="Scheduled for "
                  />
                  <strong>{formattedTime(action.startTime!)}</strong>.
                </>
              ) : (
                <>{inProgressDescription(action.creationTime)}</>
              )}
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              {isScheduled ? (
                <EuiIcon type="clock" aria-hidden={true} />
              ) : (
                <EuiIcon type="trash" aria-hidden={true} />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText data-test-subj="unenrollInProgressTitle">
                {isScheduled ? (
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.unenrollScheduledTitle"
                    defaultMessage="{nbAgents, plural, one {# agent scheduled to be unenrolled} other {# agents scheduled to be unenrolled}}"
                    values={{
                      nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
                    }}
                  />
                ) : (
                  inProgressTitle(action, false)
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {isScheduled && (
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              size="m"
              color="warning"
              iconType="warning"
              data-test-subj="unenrollGracePeriodWarning"
              title={
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.unenrollGracePeriodWarning"
                  defaultMessage="Cancel before {time}."
                  values={{ time: formattedTime(action.startTime!) }}
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.unenrollGracePeriodWarningBody"
                defaultMessage="After this point, some agents may already be unenrolled."
              />
            </EuiCallOut>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <ViewAgentsButton action={action} onClickViewAgents={onClickViewAgents} />
            </EuiFlexItem>
            {isScheduled && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={onClickAbortUnenroll}
                  isLoading={isAborting}
                  data-test-subj="abortUnenrollBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.cancelUnenrollButton"
                    defaultMessage="Cancel unenrollment"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
