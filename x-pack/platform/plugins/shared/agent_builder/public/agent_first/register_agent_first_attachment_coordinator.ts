/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  registerAgentFirstAttachmentCoordinator,
} from '@kbn/core-chrome-browser-components';
import type { AgentBuilderPluginStart } from '../types';
import { AgentFirstAttachmentCoordinatorProvider } from './attachment_coordinator/attachment_coordinator_provider';
// Overflow "Attach to" POC — disabled for now; re-enable via registerAgentFirstAttachAppMenuItem.
// import { registerAgentFirstAttachAppMenuItem } from './register_agent_first_app_menu_item';

export const registerAgentFirstAttachmentCoordinatorShell = ({
  agentBuilder,
}: {
  core: CoreStart;
  agentBuilder: AgentBuilderPluginStart;
}): (() => void) => {
  const unregisterCoordinator = registerAgentFirstAttachmentCoordinator(({ children }) =>
    React.createElement(AgentFirstAttachmentCoordinatorProvider, { agentBuilder }, children)
  );

  // const unregisterMenuItem = registerAgentFirstAttachAppMenuItem(core);

  return () => {
    // unregisterMenuItem();
    unregisterCoordinator();
  };
};
