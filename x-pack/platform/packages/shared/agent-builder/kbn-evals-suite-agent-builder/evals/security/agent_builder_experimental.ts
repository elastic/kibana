/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingValues } from '@kbn/kbn-client';

interface AgentBuilderUiSettings {
  set: (values: UiSettingValues) => Promise<void>;
  unset: (...keys: string[]) => Promise<unknown>;
}

const AGENT_BUILDER_EXPERIMENTAL_UI_SETTING = 'agentBuilder:experimentalFeatures' as const;

function isOverriddenUiSettingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('because it is overridden');
}

/** Security skills require experimental Agent Builder features in Scout eval runs. */
export async function enableAgentBuilderExperimentalFeatures(
  uiSettings: AgentBuilderUiSettings
): Promise<void> {
  try {
    await uiSettings.set({ [AGENT_BUILDER_EXPERIMENTAL_UI_SETTING]: true });
  } catch (error) {
    if (!isOverriddenUiSettingError(error)) {
      throw error;
    }
    // evals_* server config sets (e.g. evals_siem_readiness) already override this flag.
  }
}

export async function disableAgentBuilderExperimentalFeatures(
  uiSettings: AgentBuilderUiSettings
): Promise<void> {
  try {
    await uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_UI_SETTING);
  } catch (error) {
    if (!isOverriddenUiSettingError(error)) {
      throw error;
    }
  }
}
