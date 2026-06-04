/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiPanel, EuiHealth, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';

import { UpgradeInProgressActivityItem } from './upgrade_in_progress_activity_item';
import { UnenrollInProgressActivityItem } from './unenroll_in_progress_activity_item';
import { ActivityItem } from './activity_item';

export const ActivitySection: React.FunctionComponent<{
  title: ReactNode;
  actions: ActionStatus[];
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  abortUnenroll: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
  onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}> = ({
  title,
  actions,
  abortUpgrade,
  abortUnenroll,
  onClickViewAgents,
  onClickManageAutoUpgradeAgents,
}) => {
  return (
    <>
      <EuiPanel color="subdued" hasBorder={true} borderRadius="none">
        <EuiText>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {actions.some((action) => action.status === 'IN_PROGRESS') && (
              <EuiFlexItem grow={false}>
                <EuiHealth color="success" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <b>{title}</b>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiPanel>
      {actions.map((currentAction) => {
        if (currentAction.type === 'UPGRADE' && currentAction.status === 'IN_PROGRESS') {
          return (
            <UpgradeInProgressActivityItem
              action={currentAction}
              abortUpgrade={abortUpgrade}
              key={currentAction.actionId}
              onClickViewAgents={onClickViewAgents}
              onClickManageAutoUpgradeAgents={onClickManageAutoUpgradeAgents}
            />
          );
        }
        // Show the cancellable scheduled unenrollment item only while the grace period
        // is still active (start_time in the future). Once start_time has passed the
        // execute phase will have picked up the action, so cancellation is no longer
        // meaningful and we fall through to the standard activity item rendering.
        if (
          currentAction.type === 'UNENROLL' &&
          currentAction.status === 'IN_PROGRESS' &&
          currentAction.startTime &&
          new Date(currentAction.startTime).getTime() > Date.now()
        ) {
          return (
            <UnenrollInProgressActivityItem
              action={currentAction}
              abortUnenroll={abortUnenroll}
              key={currentAction.actionId}
              onClickViewAgents={onClickViewAgents}
            />
          );
        }
        return (
          <ActivityItem
            action={currentAction}
            key={currentAction.actionId}
            onClickViewAgents={onClickViewAgents}
            onClickManageAutoUpgradeAgents={onClickManageAutoUpgradeAgents}
          />
        );
      })}
    </>
  );
};
