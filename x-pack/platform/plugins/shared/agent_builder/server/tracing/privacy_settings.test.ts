/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID,
  AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
  AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID,
} from '@kbn/management-settings-ids';
import { DISABLED_TRACING_SETTINGS, loadTracingPrivacySettings } from './privacy_settings';

describe('loadTracingPrivacySettings', () => {
  const logger = loggerMock.create();

  function createClient(getImpl: (id: string) => Promise<boolean>) {
    return { get: jest.fn((id: string) => getImpl(id)) };
  }

  it('reads all seven tracing privacy settings', async () => {
    const uiSettingsClient = createClient(
      async (id) => id === AGENT_BUILDER_TRACING_ENABLED_SETTING_ID
    );

    const settings = await loadTracingPrivacySettings({
      uiSettingsClient: uiSettingsClient as never,
      logger,
      spaceId: 'default',
    });

    expect(settings).toEqual({
      enabled: true,
      includeUserPrompts: false,
      includeLlmResponses: false,
      includeToolDetails: false,
      includeSystemPrompt: false,
      includeRealNames: false,
      includeRealIds: false,
    });
    expect(uiSettingsClient.get).toHaveBeenCalledWith(AGENT_BUILDER_TRACING_ENABLED_SETTING_ID);
    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID
    );
    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID
    );
    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID
    );
    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID
    );
    expect(uiSettingsClient.get).toHaveBeenCalledWith(AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID);
    expect(uiSettingsClient.get).toHaveBeenCalledWith(AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID);
  });

  it('fail-closes and logs when a settings lookup rejects', async () => {
    const uiSettingsClient = createClient(async () => {
      throw new Error('SO unavailable');
    });

    const settings = await loadTracingPrivacySettings({
      uiSettingsClient: uiSettingsClient as never,
      logger,
      spaceId: 'marketing',
    });

    expect(settings).toEqual(DISABLED_TRACING_SETTINGS);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to fetch Agent Builder tracing settings for space [marketing]'
      )
    );
  });
});
