/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { OnechatAgentsCreate } from './pages/agent_create';
import { OnechatAgentsEdit } from './pages/agent_edit';
import { OnechatAgentsPage } from './pages/agents';
import { OnechatConversationsPage } from './pages/conversations';
import { OnechatToolCreatePage } from './pages/tool_create';
import { OnechatToolDetailsPage } from './pages/tool_details';
import { OnechatToolsPage } from './pages/tools';

export const OnechatRoutes: React.FC<{}> = () => {
  return (
    <Routes>
      <Route path="/conversations/:conversationId">
        <OnechatConversationsPage />
      </Route>

      <Route path="/agents/new">
        <OnechatAgentsCreate />
      </Route>

      <Route path="/agents/:agentId">
        <OnechatAgentsEdit />
      </Route>

      <Route path="/agents">
        <OnechatAgentsPage />
      </Route>

      <Route path="/tools/new">
        <OnechatToolCreatePage />
      </Route>

      <Route path="/tools/:toolId">
        <OnechatToolDetailsPage />
      </Route>

      <Route path="/tools">
        <OnechatToolsPage />
      </Route>

      {/* Default to conversations page */}
      <Route path="/">
        <OnechatConversationsPage />
      </Route>
    </Routes>
  );
};
