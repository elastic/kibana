/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID,
  AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
  AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_DATA_SETTING_ID,
} from '@kbn/management-settings-ids';

export interface TracingPrivacySettings {
  enabled: boolean;
  includeUserPrompts: boolean;
  includeLlmResponses: boolean;
  includeToolDetails: boolean;
  includeSystemPrompt: boolean;
  includeRealNames: boolean;
  includeRealIds: boolean;
  includeUserData: boolean;
}

export const DISABLED_TRACING_SETTINGS: TracingPrivacySettings = {
  enabled: false,
  includeUserPrompts: false,
  includeLlmResponses: false,
  includeToolDetails: false,
  includeSystemPrompt: false,
  includeRealNames: false,
  includeRealIds: false,
  includeUserData: false,
};

/**
 * Loads Agent Builder tracing privacy uiSettings for the current request space.
 * Fail-closes to disabled settings if the lookup rejects.
 */
export const loadTracingPrivacySettings = async ({
  uiSettingsClient,
  logger,
  spaceId,
}: {
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  spaceId: string;
}): Promise<TracingPrivacySettings> => {
  try {
    const [
      enabled,
      includeUserPrompts,
      includeLlmResponses,
      includeToolDetails,
      includeSystemPrompt,
      includeRealNames,
      includeRealIds,
      includeUserData,
    ] = await Promise.all([
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_ENABLED_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID),
      uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_USER_DATA_SETTING_ID),
    ]);

    return {
      enabled,
      includeUserPrompts,
      includeLlmResponses,
      includeToolDetails,
      includeSystemPrompt,
      includeRealNames,
      includeRealIds,
      includeUserData,
    };
  } catch (error) {
    logger.error(
      `Failed to fetch Agent Builder tracing settings for space [${spaceId}]: ${error.message}`
    );
    return DISABLED_TRACING_SETTINGS;
  }
};
