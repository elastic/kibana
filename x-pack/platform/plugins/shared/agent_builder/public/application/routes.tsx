/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { AgentBuilderAgentsCreate } from './pages/agent_create';
import { AgentBuilderAgentsEdit } from './pages/agent_edit';
import { AgentBuilderAgentsPage } from './pages/agents';
import { AgentBuilderConversationsPage } from './pages/conversations';
import { AgentBuilderToolCreatePage } from './pages/tool_create';
import { AgentBuilderToolDetailsPage } from './pages/tool_details';
import { AgentBuilderToolsPage } from './pages/tools';
import { AgentBuilderBulkImportMcpToolsPage } from './pages/bulk_import_mcp_tools';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  return (
    <Routes>
      <Route path="/conversations/:conversationId">
        <AgentBuilderConversationsPage />
      </Route>

      <Route path="/agents/new">
        <AgentBuilderAgentsCreate />
      </Route>

      <Route path="/agents/:agentId">
        <AgentBuilderAgentsEdit />
      </Route>

      <Route path="/agents">
        <AgentBuilderAgentsPage />
      </Route>

      <Route path="/tools/new">
        <AgentBuilderToolCreatePage />
      </Route>

      <Route path="/tools/bulk_import_mcp">
        <AgentBuilderBulkImportMcpToolsPage />
      </Route>

      <Route path="/tools/:toolId">
        <AgentBuilderToolDetailsPage />
      </Route>

      <Route path="/tools">
        <AgentBuilderToolsPage />
      </Route>

      {/* Default to conversations page */}
      <Route path="/">
        <AgentBuilderConversationsPage />
      </Route>
    </Routes>
  );
};
