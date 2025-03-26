/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiPanel, EuiIcon } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';

import { UpgradeInProgressActivityItem } from './upgrade_in_progress_activity_item';
import { ActivityItem } from './activity_item';

export const ActivitySection: React.FunctionComponent<{
  title: ReactNode;
  actions: ActionStatus[];
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
  onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}> = ({ title, actions, abortUpgrade, onClickViewAgents, onClickManageAutoUpgradeAgents }) => {
  // unify the actions with the same policyId into single entries
  const unifiedActions: ActionStatus[] = actions.reduce(
    (acc: ActionStatus[], action: ActionStatus) => {
      // if the action is expired, we dont want to do any unification on it, it should stay by itself. Same for non-automatic actions
      if (new Date().getTime() > new Date(action.expiration!).getTime() || !action.is_automatic) {
        acc.push({ ...action });
      } else {
        // find if there is already an existing action with the same policy id, same target version, created on the same day, and in the same status so we can unify them in the UI to clean things up
        const existingAction = acc.find(
          (a) =>
            a.policyId === action.policyId &&
            a.version === action.version &&
            a.status === action.status &&
            new Date(a.creationTime).toDateString() === new Date(action.creationTime).toDateString()
        );
        // add the values together
        if (existingAction) {
          existingAction.nbAgentsAck += action.nbAgentsAck;
          existingAction.nbAgentsActioned += action.nbAgentsActioned;
          existingAction.nbAgentsActionCreated += action.nbAgentsActionCreated;
          existingAction.nbAgentsFailed += action.nbAgentsFailed;
        } else {
          acc.push({ ...action });
        }
      }

      return acc;
    },
    []
  );
  return (
    <>
      <EuiPanel color="subdued" hasBorder={true} borderRadius="none">
        <EuiText className="eui-alignCenter">
          {unifiedActions.some((action) => action.status === 'IN_PROGRESS') && (
            <EuiIcon type="dot" color="success" />
          )}

          <b>{title}</b>
        </EuiText>
      </EuiPanel>
      {unifiedActions.map((currentAction, index) =>
        currentAction.type === 'UPGRADE' && currentAction.status === 'IN_PROGRESS' ? (
          <UpgradeInProgressActivityItem
            action={currentAction}
            abortUpgrade={abortUpgrade}
            key={currentAction.actionId}
            onClickViewAgents={onClickViewAgents}
            onClickManageAutoUpgradeAgents={onClickManageAutoUpgradeAgents}
          />
        ) : (
          <ActivityItem
            action={currentAction}
            key={currentAction.actionId}
            onClickViewAgents={onClickViewAgents}
          />
        )
      )}
    </>
  );
};
