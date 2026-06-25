/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ConnectorsProvider } from '../context/connectors_provider';
import { AgentConnectors } from '../components/agents/connectors/agent_connectors';
import { useAgentBuilderAgentById } from '../hooks/agents/use_agent_by_id';
import { useAgentConnectors } from '../hooks/connectors/use_agent_connectors';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

export const AgentBuilderAgentConnectorsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent } = useAgentBuilderAgentById(agentId);
  const { assign } = useAgentConnectors({ agentId });

  const breadcrumbs = useMemo(
    () => [{ text: agent?.name ?? agentId, path: appPaths.agent.overview({ agentId }) }],
    [agent?.name, agentId]
  );

  useBreadcrumb(breadcrumbs);

  return (
    <ConnectorsProvider onConnectorCreated={(connector) => assign(connector)}>
      <AgentConnectors agentId={agentId} />
    </ConnectorsProvider>
  );
};
