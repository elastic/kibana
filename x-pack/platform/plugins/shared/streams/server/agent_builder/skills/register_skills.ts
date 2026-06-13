/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { StreamsKIsOnboardingClient } from '../../lib/workflows/onboarding_workflow_client';
import type { MemoryToolsOptions } from '../tools/memory';
import { streamsManagementSkill } from './streams_management_skill';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { createKiIdentificationManagementSkill } from './ki_identification_management';
import { sigEventsManagementSkill } from './sig_events_management';
import {
  createGapDetectionSkill,
  createMemorySynthesisSkill,
  createMemoryConsolidationSkill,
  createConversationScraperSkill,
} from './memory';
import {
  investigationContextSkill,
  hypothesisGatherSkill,
  hypothesisReviewSkill,
  investigationSynthesisSkill,
  investigationRunnerSkill,
} from './investigation';

export const registerAgentBuilderSkills = ({
  agentBuilder,
  telemetry,
  memoryToolsOptions,
  streamsKIsOnboardingClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  telemetry: EbtTelemetryClient;
  memoryToolsOptions: MemoryToolsOptions;
  streamsKIsOnboardingClient?: StreamsKIsOnboardingClient;
}): void => {
  if (!agentBuilder) {
    return;
  }

  const streamsSkills = [
    streamsManagementSkill,
    knowledgeIndicatorsManagementSkill,
    sigEventsManagementSkill,
    investigationContextSkill,
    hypothesisGatherSkill,
    hypothesisReviewSkill,
    investigationSynthesisSkill,
    investigationRunnerSkill,
    ...(streamsKIsOnboardingClient
      ? [createKiIdentificationManagementSkill({ telemetry, streamsKIsOnboardingClient })]
      : []),
    createGapDetectionSkill(memoryToolsOptions),
    createMemorySynthesisSkill(memoryToolsOptions),
    createMemoryConsolidationSkill(memoryToolsOptions),
    createConversationScraperSkill(memoryToolsOptions),
  ];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
