/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { OnechatToolsPage } from './pages/tools';
import { OnechatConversationsPage } from './pages/conversations';
import { OnechatAgentsPage } from './pages/agents';
import { OnechatAgentsCreate } from './pages/agent_create';
import { OnechatAgentsEdit } from './pages/agent_edit';

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

      <Route path="/tools">
        <OnechatToolsPage />
      </Route>

      <Route path="/agents">
        <OnechatAgentsPage />
      </Route>

      {/* Default to conversations page */}
      <Route path="/">
        <OnechatConversationsPage />
      </Route>
    </Routes>
  );
};
