/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../../types';
import { createRcaSkill } from './rca';

export const registerAgentBuilderSkills = ({
  agentBuilder,
  server,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  server: StreamsServer;
  logger: Logger;
}): void => {
  const streamsSkills = [createRcaSkill()];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
