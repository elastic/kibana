/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SkillInvocationOrigin,
  SkillSolutionArea,
} from '@kbn/agent-builder-common/telemetry/agent_builder_events';

/**
 * Payload reported when a skill is invoked. Mirrors the shape used by the
 * AnalyticsService implementation in the agent_builder plugin.
 */
export interface SkillInvokedEvent {
  skillId: string;
  origin: SkillInvocationOrigin;
  solutionArea: SkillSolutionArea;
  pluginId?: string;
  agentId?: string;
  conversationId?: string;
  executionId?: string;
  toolCount: number;
}

/**
 * Minimal analytics surface needed by skill loading. The plugin's
 * `AnalyticsService` class structurally satisfies this interface.
 */
export interface AgentBuilderAnalytics {
  reportSkillInvoked(event: SkillInvokedEvent): void;
}

/**
 * Minimal tracking surface needed by skill loading. The plugin's
 * `TrackingService` class structurally satisfies this interface.
 */
export interface AgentBuilderTracking {
  trackSkillInvocation(origin: SkillInvocationOrigin): void;
}
