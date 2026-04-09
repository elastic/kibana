/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal slice of Kibana {@link Capabilities} used to decide if the user can
 * change the space-level chat experience on Gen AI Settings (aligned with
 * `enabled_features_context` + `chat_experience` save permission).
 */
export interface ChatExperienceCapabilitiesInput {
  advancedSettings?: { save?: boolean };
  observabilityAIAssistant?: { show?: boolean };
  securitySolutionAssistant?: { 'ai-assistant'?: boolean };
  agentBuilder?: { manageAgents?: boolean };
}

/**
 * Returns true when the user can persist the preferred chat experience UI setting
 * for the space (same conditions as showing an editable chat experience control
 * on Gen AI Settings).
 */
export function canUserChangeSpaceChatExperience(
  capabilities: ChatExperienceCapabilitiesInput
): boolean {
  const canSaveSpaceUiSettings = capabilities.advancedSettings?.save === true;
  const hasObservabilityAssistant = capabilities.observabilityAIAssistant?.show === true;
  const hasSecurityAssistant = capabilities.securitySolutionAssistant?.['ai-assistant'] === true;
  const hasManageAgents = capabilities.agentBuilder?.manageAgents === true;

  return (
    canSaveSpaceUiSettings && (hasObservabilityAssistant || hasSecurityAssistant) && hasManageAgents
  );
}
