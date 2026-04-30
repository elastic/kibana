/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { WorkflowsManagementApi } from '../../lib/workflows/workflow_execution_client';
import { streamsManagementSkill } from './streams_management_skill';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { createKiIdentificationManagementSkill } from './ki_identification_management';

export const registerAgentBuilderSkills = ({
  agentBuilder,
  telemetry,
  workflowsManagementApi,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  telemetry: EbtTelemetryClient;
  workflowsManagementApi?: WorkflowsManagementApi;
}): void => {
  if (!agentBuilder || !workflowsManagementApi) {
    return;
  }

  const streamsSkills = [
    streamsManagementSkill,
    knowledgeIndicatorsManagementSkill,
    createKiIdentificationManagementSkill({ telemetry, workflowsManagementApi }),
  ];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
