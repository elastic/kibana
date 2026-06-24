/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  registerAgentWorkspaceContent,
  unregisterAgentWorkspaceContent,
} from '@kbn/core-chrome-browser-components';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';
import { AgentWorkspaceMount, setAgentWorkspaceMountContext } from './agent_workspace_mount';
import { clearAgentWorkspaceNavigation } from './agent_workspace_navigation';
import { clearAgentWorkspaceLeaveHandlers } from './agent_workspace_app_leave';

export const registerAgentWorkspaceSlot = ({
  core,
  plugins,
  getServices,
}: {
  core: CoreStart;
  plugins: AgentBuilderStartDependencies;
  getServices: () => AgentBuilderInternalService;
}): void => {
  setAgentWorkspaceMountContext({ core, plugins, getServices });
  registerAgentWorkspaceContent(AgentWorkspaceMount);
};

export const unregisterAgentWorkspaceSlot = (): void => {
  unregisterAgentWorkspaceContent();
  setAgentWorkspaceMountContext(null);
  clearAgentWorkspaceNavigation();
  clearAgentWorkspaceLeaveHandlers();
};
