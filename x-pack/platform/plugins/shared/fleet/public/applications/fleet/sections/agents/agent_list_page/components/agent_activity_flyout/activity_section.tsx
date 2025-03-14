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
  // gets the total count of agents in all the actions for this section
  useEffect(() => {
    const fetchTotalAgentsInActions = async () => {
      const total = await getTotalAgentsInActions(actions);

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
