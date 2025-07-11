/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiBadge } from '@elastic/eui';
import { useOnechatAgentById } from '../../hooks/agents/use_agent_by_id';

interface AgentDisplayProps {
  selectedAgentId?: string;
}

export const AgentDisplay: React.FC<AgentDisplayProps> = ({ selectedAgentId }) => {
  const { agent, isLoading } = useOnechatAgentById(selectedAgentId!);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  return <EuiBadge> {agent?.name}</EuiBadge>;
};
