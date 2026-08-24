/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { isAllowedBuiltinAgent } from '@kbn/agent-builder-server/allow_lists';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { CONTEXT_ENGINE_FEEDBACK_AGENT_ID } from '@kbn/context-engine-plugin/common/constants';
import { feedbackLoopAgent, registerFeedbackLoopAgent } from './agent';

const checkAvailability = async (enabled: boolean | undefined) => {
  const uiSettings = uiSettingsServiceMock.createClient();
  uiSettings.get.mockResolvedValue(enabled);

  return feedbackLoopAgent.availability!.handler({
    uiSettings,
    spaceId: 'default',
    request: {} as KibanaRequest,
  });
};

describe('feedbackLoopAgent', () => {
  it('uses the id both plugins agree on, and is allowed as a built-in', () => {
    expect(feedbackLoopAgent.id).toBe(CONTEXT_ENGINE_FEEDBACK_AGENT_ID);
    expect(isAllowedBuiltinAgent(feedbackLoopAgent.id)).toBe(true);
  });

  it('grants the same capabilities as the default Elastic agent', () => {
    expect(feedbackLoopAgent.configuration).toEqual(
      expect.objectContaining({
        enable_elastic_capabilities: true,
        tools: [],
        skill_ids: [],
      })
    );
  });

  it('instructs the agent to work autonomously and answer with suggestions only', () => {
    const { instructions } = feedbackLoopAgent.configuration as { instructions: string };

    expect(instructions).toContain('Never ask the user a question');
    expect(instructions).toContain('structured suggestion list only');
  });

  it('is available when Context Engine is enabled', async () => {
    await expect(checkAvailability(true)).resolves.toEqual({ status: 'available' });
  });

  it('is unavailable when Context Engine is disabled', async () => {
    await expect(checkAvailability(false)).resolves.toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );
  });

  it('is unavailable when the Context Engine setting is not registered at all', async () => {
    await expect(checkAvailability(undefined)).resolves.toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );
  });

  it('reads availability from the Context Engine setting', async () => {
    const uiSettings = uiSettingsServiceMock.createClient();
    uiSettings.get.mockResolvedValue(true);

    await feedbackLoopAgent.availability!.handler({
      uiSettings,
      spaceId: 'default',
      request: {} as KibanaRequest,
    });

    expect(uiSettings.get).toHaveBeenCalledWith(CONTEXT_ENGINE_ENABLED_SETTING_ID);
  });
});

describe('registerFeedbackLoopAgent', () => {
  it('registers the agent with Agent Builder', () => {
    const register = jest.fn();
    registerFeedbackLoopAgent({
      agents: { register },
    } as unknown as AgentBuilderPluginSetup);

    expect(register).toHaveBeenCalledWith(feedbackLoopAgent);
  });
});
