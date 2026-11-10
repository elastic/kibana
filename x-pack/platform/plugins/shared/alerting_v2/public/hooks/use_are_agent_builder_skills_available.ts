/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { CoreStart, useService } from '@kbn/core-di-browser';

/**
 * Granular prerequisites shared by all Alerting v2 Agent Builder skills. Exposed (rather than only a
 * single boolean) so callers can explain which specific requirement is missing.
 */
export interface AgentBuilderSkillsRequirements {
  /** Whether the user has the privilege backing `capabilities.agentBuilder.show`. */
  hasAgentBuilderCapability: boolean;
}

/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export const getAgentBuilderSkillsRequirements = (
  application: ApplicationStart
): AgentBuilderSkillsRequirements => ({
  hasAgentBuilderCapability: application.capabilities.agentBuilder?.show === true,
});

/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export const getAreAgentBuilderSkillsAvailable = (application: ApplicationStart): boolean =>
  getAgentBuilderSkillsRequirements(application).hasAgentBuilderCapability;

/**
 * Hook exposing the granular skill prerequisites for components in the Inversify DI context.
 */
export const useAgentBuilderSkillsRequirements = (): AgentBuilderSkillsRequirements => {
  const application = useService(CoreStart('application'));
  return getAgentBuilderSkillsRequirements(application);
};

/**
 * Hook for components rendered inside the Inversify DI context.
 */
export const useAreAgentBuilderSkillsAvailable = (): boolean => {
  const application = useService(CoreStart('application'));
  return getAreAgentBuilderSkillsAvailable(application);
};
