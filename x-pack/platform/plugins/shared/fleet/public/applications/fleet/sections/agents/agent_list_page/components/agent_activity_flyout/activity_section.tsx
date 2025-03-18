/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiPanel } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';
// import { sendPostRetrieveAgentsByActions } from '../../../../../hooks';

import { UpgradeInProgressActivityItem } from './upgrade_in_progress_activity_item';
import { ActivityItem } from './activity_item';
// const getAllAgentsPerPolicy = async (actions: ActionStatus[]) => {
//   // for every action, use the policy id to get the total count of agents in the policy
//   const totalAgentsPerPolicy = {};
//   actions.forEach((action) => {
//     // need to get all agents in the policy
//   });
// };
export const ActivitySection: React.FunctionComponent<{
  title: ReactNode;
  actions: ActionStatus[];
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
  onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
  numAgents: number;
}> = ({
  title,
  actions,
  abortUpgrade,
  onClickViewAgents,
  onClickManageAutoUpgradeAgents,
  numAgents,
}) => {
  // const [totalAgentsPerPolicy, setTotalAgentsPerPolicy] = useState({});
  // // gets the total count of agents in all the actions for this section
  // useEffect(() => {
  //   const fetchTotalAgentsPerPolicy = async () => {
  //     const total = await getAllAgentsPerPolicy(actions);

  //     setTotalAgentsPerPolicy(total);
  //   };
  //   fetchTotalAgentsPerPolicy();
  // });

  // unify the actions with the same policyId into single entries
  console.log('the actions here: ', actions);
  const unifiedActions: ActionStatus[] = actions.reduce(
    (acc: ActionStatus[], action: ActionStatus) => {
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
      return acc;
    },
    [actions[0]] // start with the first entry added to the accumulator to avoid needing a guard clause
  );
  console.log('the unified actions here: ', unifiedActions);
  return (
    <>
      <EuiPanel color="subdued" hasBorder={true} borderRadius="none">
        <EuiText>
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
            totalAgentsInPolicy={numAgents}
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
