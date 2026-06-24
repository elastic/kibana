/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AgentBuilderUiSettings {
  set: (settings: Record<string, unknown>) => Promise<void>;
  unset: (key: string) => Promise<void>;
}

const AGENT_BUILDER_EXPERIMENTAL_UI_SETTING = 'agentBuilder:experimentalFeatures' as const;

/** Security skills require experimental Agent Builder features in Scout eval runs. */
export async function enableAgentBuilderExperimentalFeatures(
  uiSettings: AgentBuilderUiSettings
): Promise<void> {
  await uiSettings.set({ [AGENT_BUILDER_EXPERIMENTAL_UI_SETTING]: true });
}

export async function disableAgentBuilderExperimentalFeatures(
  uiSettings: AgentBuilderUiSettings
): Promise<void> {
  await uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_UI_SETTING);
}
