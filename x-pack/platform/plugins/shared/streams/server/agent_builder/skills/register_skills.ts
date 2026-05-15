/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../routes/types';
import { streamsManagementSkill } from './streams_management_skill';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { createKiIdentificationManagementSkill } from './ki_identification_management';

export const registerAgentBuilderSkills = ({
  agentBuilder,
  getScopedClients,
  telemetry,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  telemetry: EbtTelemetryClient;
}): void => {
  if (!agentBuilder) {
    return;
  }

  const streamsSkills = [
    streamsManagementSkill,
    knowledgeIndicatorsManagementSkill,
    createKiIdentificationManagementSkill({ getScopedClients, telemetry }),
  ];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
