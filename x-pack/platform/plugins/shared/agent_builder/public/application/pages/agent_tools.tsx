/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AgentTools } from '../components/agents/tools/agent_tools';
import { useAgentBuilderAgentById } from '../hooks/agents/use_agent_by_id';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderAgentToolsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent } = useAgentBuilderAgentById(agentId);

  const breadcrumbs = useMemo(
    () => [
      { text: agent?.name ?? agentId, path: appPaths.agent.overview({ agentId }) },
      { text: labels.tools.title },
    ],
    [agent?.name, agentId]
  );

  useBreadcrumb(breadcrumbs);

  return <AgentTools />;
};
