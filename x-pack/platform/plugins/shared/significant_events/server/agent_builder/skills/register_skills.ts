/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { SignificantEventsKIsOnboardingClient } from '../../lib/workflows/onboarding_workflow_client';
import type { MemoryToolsOptions } from '../tools/memory';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { createKiIdentificationManagementSkill } from './ki_identification_management';
import { significantEventsManagementSkill } from './significant_events_management';
import { createSignificantEventsOnboardingSkill } from './significant_events_onboarding_skill';
import { significantEventsKIGroundingSkill } from './significant_events_ki_grounding';
import { createGapDetectionSkill } from './memory';

export const registerAgentBuilderSkills = ({
  agentBuilder,
  telemetry,
  streamsKIsOnboardingClient,
  memoryToolsOptions,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  telemetry: EbtTelemetryClient;
  streamsKIsOnboardingClient?: SignificantEventsKIsOnboardingClient;
  memoryToolsOptions: MemoryToolsOptions;
}): void => {
  if (!agentBuilder) {
    return;
  }

  const streamsSkills = [
    knowledgeIndicatorsManagementSkill,
    significantEventsKIGroundingSkill,
    significantEventsManagementSkill,
    ...(streamsKIsOnboardingClient
      ? [createKiIdentificationManagementSkill({ telemetry, streamsKIsOnboardingClient })]
      : []),
    createSignificantEventsOnboardingSkill(memoryToolsOptions),
    createGapDetectionSkill(memoryToolsOptions),
  ];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
