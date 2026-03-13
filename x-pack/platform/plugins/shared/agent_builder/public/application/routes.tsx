/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';

import { AppLayout } from './components/layout';
import { RouteDisplay } from './components/common/route_display';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  return (
    <AppLayout>
      <Routes>
        {/* Agent-scoped routes */}
        <Route path="/agents/:agentId/conversations/:conversationId">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId/skills">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId/tools">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId/plugins">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId/connectors">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId/instructions">
          <RouteDisplay />
        </Route>
        <Route path="/agents/:agentId">
          <RouteDisplay />
        </Route>

        {/* Manage routes (global CRUD) */}
        <Route path="/manage/agents/new">
          <RouteDisplay />
        </Route>
        <Route path="/manage/agents">
          <RouteDisplay />
        </Route>
        <Route path="/manage/tools/bulk_import_mcp">
          <RouteDisplay />
        </Route>
        <Route path="/manage/tools/new">
          <RouteDisplay />
        </Route>
        <Route path="/manage/tools/:toolId">
          <RouteDisplay />
        </Route>
        <Route path="/manage/tools">
          <RouteDisplay />
        </Route>
        <Route path="/manage/skills/new">
          <RouteDisplay />
        </Route>
        <Route path="/manage/skills/:skillId">
          <RouteDisplay />
        </Route>
        <Route path="/manage/skills">
          <RouteDisplay />
        </Route>
        <Route path="/manage/plugins/:pluginId">
          <RouteDisplay />
        </Route>
        <Route path="/manage/plugins">
          <RouteDisplay />
        </Route>
        <Route path="/manage/connectors">
          <RouteDisplay />
        </Route>

        {/* Legacy routes (will redirect in Phase 5) */}
        <Route path="/conversations/:conversationId">
          <RouteDisplay />
        </Route>

        {/* Root route (will redirect in Phase 5) */}
        <Route path="/">
          <RouteDisplay />
        </Route>
      </Routes>
    </AppLayout>
  );
};
