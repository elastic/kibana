/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AgentForm } from './agent_form';
import { DeleteAgentProvider, useDeleteAgent } from '../../../context/delete_agent_context';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';

interface EditAgentProps {
  agentId: string;
}

const EditAgentForm: React.FC<EditAgentProps> = ({ agentId }) => {
  const { deleteAgent } = useDeleteAgent();
  const { agent } = useAgentBuilderAgentById(agentId);
  return (
    <AgentForm
      editingAgentId={agentId}
      onDelete={() => {
        if (agent) {
          deleteAgent({ agent });
        }
      }}
    />
  );
};

export const EditAgent: React.FC<EditAgentProps> = ({ agentId }) => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  return (
    <DeleteAgentProvider
      onSuccess={() => {
        navigateToAgentBuilderUrl(appPaths.agents.list);
      }}
    >
      <EditAgentForm agentId={agentId} />
    </DeleteAgentProvider>
  );
};
