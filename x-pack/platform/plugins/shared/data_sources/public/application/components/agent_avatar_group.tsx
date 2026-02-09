/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiAvatar, EuiToolTip } from '@elastic/eui';
import type { Agent } from '../../types/connector';

interface AgentAvatarGroupProps {
  agents: Agent[];
  maxCount?: number;
}

export const AgentAvatarGroup: React.FC<AgentAvatarGroupProps> = ({ agents, maxCount = 3 }) => {
  const displayAgents = agents.slice(0, maxCount);
  const remainingAgents = agents.slice(maxCount);
  const remainingCount = remainingAgents.length;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {displayAgents.map((agent) => {
        return (
          <EuiFlexItem key={agent.id} grow={false}>
            <EuiToolTip content={agent.name} position="top">
              <EuiAvatar
                name={agent.name}
                size="s"
                initials={agent.symbol}
                color={agent.color}
                type="user"
              />
            </EuiToolTip>
          </EuiFlexItem>
        );
      })}
      {remainingCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              <div>
                {remainingAgents.map((agent) => (
                  <div key={agent.id}>{agent.name}</div>
                ))}
              </div>
            }
            position="top"
          >
            <EuiAvatar name={`+${remainingCount}`} size="s" initials={`+${remainingCount}`} />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
