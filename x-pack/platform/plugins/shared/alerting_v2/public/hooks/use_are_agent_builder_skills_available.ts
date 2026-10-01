/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';

/**
 * Granular prerequisites shared by all Alerting v2 Agent Builder skills. Exposed (rather than only a
 * single boolean) so callers can explain which specific requirement is missing.
 */
export interface AgentBuilderSkillsRequirements {
  /** Whether the user has the privilege backing `capabilities.agentBuilder.show`. */
  hasAgentBuilderCapability: boolean;
  /** Whether the `agentBuilder:experimentalFeatures` advanced setting is enabled. */
  isExperimentalFeaturesEnabled: boolean;
}

/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export const getAgentBuilderSkillsRequirements = (
  application: ApplicationStart,
  uiSettings: IUiSettingsClient
): AgentBuilderSkillsRequirements => ({
  hasAgentBuilderCapability: application.capabilities.agentBuilder?.show === true,
  isExperimentalFeaturesEnabled:
    uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) === true,
});

/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export const getAreAgentBuilderSkillsAvailable = (
  application: ApplicationStart,
  uiSettings: IUiSettingsClient
): boolean => {
  const { hasAgentBuilderCapability, isExperimentalFeaturesEnabled } =
    getAgentBuilderSkillsRequirements(application, uiSettings);
  return hasAgentBuilderCapability && isExperimentalFeaturesEnabled;
};

/**
 * Hook exposing the granular skill prerequisites for components in the Inversify DI context.
 */
export const useAgentBuilderSkillsRequirements = (): AgentBuilderSkillsRequirements => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const application = useService(CoreStart('application'));
  return getAgentBuilderSkillsRequirements(application, uiSettings);
};

/**
 * Hook for components rendered inside the Inversify DI context.
 */
export const useAreAgentBuilderSkillsAvailable = (): boolean => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const application = useService(CoreStart('application'));
  return getAreAgentBuilderSkillsAvailable(application, uiSettings);
};
