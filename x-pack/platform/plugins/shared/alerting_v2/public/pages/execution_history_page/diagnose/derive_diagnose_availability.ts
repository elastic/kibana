/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Matches Agent Builder `minimumLicense` / `hasAtLeast('enterprise')`.
 */
export const AGENT_BUILDER_REQUIRED_LICENSE_TIER = 'enterprise';

/** Failed-rule "Diagnose with AI" availability: A (ready), B (no LLM), C (license), D (hidden). */
export type DiagnoseState = 'a' | 'b' | 'c' | 'd';

export interface EmbeddableChatAccessSnapshot {
  hasRequiredLicense: boolean;
  hasLlmConnector: boolean;
}

export interface DeriveDiagnoseAvailabilityInput {
  /** Agent Builder start contract resolved (plugin present in the deployment). */
  pluginPresent: boolean;
  /** `capabilities.agentBuilder.show`. */
  hasShowPrivilege: boolean;
  /**
   * Result of `getAgentBuilderAccess()`. Null while loading or when the call failed — both
   * degrade to D (never advertise what cannot be verified).
   */
  access: EmbeddableChatAccessSnapshot | null;
}

/** Map Agent Builder presence / license / LLM connector into the four states. */
export const deriveDiagnoseAvailability = ({
  pluginPresent,
  hasShowPrivilege,
  access,
}: DeriveDiagnoseAvailabilityInput): DiagnoseState => {
  if (!pluginPresent || !hasShowPrivilege || access == null) {
    return 'd';
  }
  if (!access.hasRequiredLicense) {
    return 'c';
  }
  if (!access.hasLlmConnector) {
    return 'b';
  }
  return 'a';
};
