/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../routes/types';
import type { StreamsServer } from '../types';
import { registerAgentBuilderTools } from './tools/register_tools';
import { streamExplorationSkill } from './skills/stream_exploration_skill';
import { createStreamSmlType } from './sml/stream_sml_type';
import { createStreamAttachmentType } from './attachments/stream_attachment_type';

export const registerStreamsAgentBuilder = ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  core,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  core: CoreSetup;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger });
  agentBuilder.skills.register(streamExplorationSkill);
  agentBuilder.sml.registerType(createStreamSmlType({ core, logger }));
  agentBuilder.attachments.registerType(
    createStreamAttachmentType({ core, logger }) as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
};
