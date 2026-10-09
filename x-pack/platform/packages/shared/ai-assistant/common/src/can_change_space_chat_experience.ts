/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';

/**
 * Returns true when the user can persist the preferred chat experience UI setting
 * for the space (same conditions as showing an editable chat experience control
 * on Gen AI Settings).
 */
export function canUserChangeSpaceChatExperience(capabilities: Capabilities): boolean {
  const canSaveSpaceUiSettings = capabilities.advancedSettings?.save === true;
  const hasObservabilityAssistant = capabilities.observabilityAIAssistant?.show === true;
  const hasSecurityAssistant = capabilities.securitySolutionAssistant?.['ai-assistant'] === true;
  const hasManageAgents = capabilities.agentBuilder?.manageAgents === true;

  return (
    canSaveSpaceUiSettings && (hasObservabilityAssistant || hasSecurityAssistant) && hasManageAgents
  );
}
