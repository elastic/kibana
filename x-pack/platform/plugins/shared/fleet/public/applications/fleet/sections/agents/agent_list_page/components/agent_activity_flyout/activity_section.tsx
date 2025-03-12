/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiText, EuiPanel } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';
import { sendPostRetrieveAgentsByActions } from '../../../../../hooks';

import { UpgradeInProgressActivityItem } from './upgrade_in_progress_activity_item';
import { ActivityItem } from './activity_item';
const getTotalAgentsInActions = async (actions: ActionStatus[]) => {
  // First get the agents ids by the action id
  const { data } = await sendPostRetrieveAgentsByActions({
    actionIds: actions.map((i) => i.actionId),
  });
  if (data?.items?.length) {
    //  now we have a list of all agents ids
    const agentIds = data.items;
    return agentIds.length;
  }
  return 0;
};
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
  const [totalAgentsInActions, setTotalAgentsInActions] = useState(0);
  //TODO: using all the actions ids, get the list of agent ids using the api. That gives you the total count of agents to be upgraded in this section. Then we can track how many have finished of the total. Then, we can compare the total in the actions to the all time total.
  useEffect(() => {
    const fetchTotalAgentsInActions = async () => {
      const total = await getTotalAgentsInActions(actions);
      console.log('the total of agents in all actions is', total);
      console.log('the total of all agents is', numAgents);
      setTotalAgentsInActions(total);
    };
    fetchTotalAgentsInActions();
  });

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
            progress={{
              actionProgress: index / totalAgentsInActions,
              totalProgress: totalAgentsInActions / numAgents,
            }}
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
