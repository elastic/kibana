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

  return (
    <>
      <EuiPanel color="subdued" hasBorder={true} borderRadius="none">
        <EuiText>
          <b>{title}</b>
        </EuiText>
      </EuiPanel>
      {actions.map((currentAction, index) =>
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
