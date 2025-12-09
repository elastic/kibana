/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAvatar } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';

interface AgentAvatarProps {
  agent: Pick<AgentDefinition, 'name' | 'avatar_symbol' | 'avatar_color'>;
  size: EuiAvatarProps['size'];
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ size, agent }) => {
  return (
    <EuiAvatar
      size={size}
      name={agent.name}
      initials={agent.avatar_symbol}
      color={agent.avatar_color}
    />
  );
};
