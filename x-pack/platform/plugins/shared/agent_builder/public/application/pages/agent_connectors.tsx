/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AgentProvider, useAgentContext } from '../context/agent_provider';
import { ConnectorsProvider } from '../context/connectors_provider';
import { AgentConnectors } from '../components/agents/connectors/agent_connectors';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

const AgentConnectorsPageContent = () => {
  const { agent, agentId, assignConnectorToAgent } = useAgentContext();

  const breadcrumbs = useMemo(
    () => [
      { text: agent?.name ?? agentId, path: appPaths.agent.overview({ agentId }) },
      { text: labels.connectors.libraryTitle },
    ],
    [agent?.name, agentId]
  );

  useBreadcrumb(breadcrumbs);

  return (
    <ConnectorsProvider onConnectorCreated={assignConnectorToAgent}>
      <AgentConnectors />
    </ConnectorsProvider>
  );
};

export const AgentBuilderAgentConnectorsPage: React.FC = () => (
  <AgentProvider>
    <AgentConnectorsPageContent />
  </AgentProvider>
);
