/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type { AgentBuilderPluginSetup, AgentsStart } from '@kbn/agent-builder-server';
import type { FilesStart } from '@kbn/files-plugin/server';
import type { PlatformCoreSetup } from './start_types';
import { registerTools } from './tools';
import { registerAttachmentTypes } from './attachment_types';
import { registerConversationEventTypes } from './conversation_events';
import { registerConversationTemplates } from './conversation_templates';
import { registerSkills } from './skills';

/**
 * Registers the platform tools, attachment types, conversation templates and events, and skills into
 * agent builder. The one runtime behind Kibana's `server` entry and the task pod's `server/tasks`
 * entry, which differ in where the files service, the cloud organization and the start contracts
 * come from.
 */
export const registerAgentBuilderPlatform = ({
  agentBuilder,
  coreSetup,
  organizationId,
  isServerless,
  logger,
  getFilesPlugin,
  getAgentsStart,
  getActionsStart,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  coreSetup: PlatformCoreSetup;
  organizationId?: string;
  isServerless: boolean;
  logger: Logger;
  getFilesPlugin: () => Promise<FilesStart>;
  getAgentsStart: () => Promise<AgentsStart>;
  getActionsStart: () => Promise<ActionsTasksStart>;
}): void => {
  registerTools({ coreSetup, agentBuilder, organizationId, isServerless });
  registerAttachmentTypes({
    agentBuilder,
    getFilesPlugin,
    getAgentsStart,
    getActionsStart,
    logger,
  });
  registerConversationTemplates({ agentBuilder });
  registerConversationEventTypes({ agentBuilder });
  registerSkills(agentBuilder, getActionsStart, logger);
};
