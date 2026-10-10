/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  ENHANCE_DASHBOARD_ACTION_ID,
} from '@kbn/dashboard-plugin/public';
import { ADD_AI_INSIGHTS_ACTION_ID } from '../common/ai_insights/constants';
import { AgentBuilderDashboardsPlugin } from './plugin';
import type {
  AgentBuilderDashboardsPluginPublicSetupDependencies,
  AgentBuilderDashboardsPluginPublicStartDependencies,
} from './types';

jest.mock('./attachment_types', () => ({
  registerDashboardAttachmentUiDefinition: jest.fn(() => jest.fn()),
  createIdGenerator: () => ({
    current: 'draft-id',
    next: jest.fn(),
  }),
}));

describe('AgentBuilderDashboardsPlugin', () => {
  const registerActionAsync = jest.fn();
  const attachAction = jest.fn();
  const registerEmbeddablePublicDefinition = jest.fn();
  const openChat = jest.fn();

  const createCoreStart = (showAgentBuilder: boolean) =>
    ({
      application: {
        capabilities: {
          agentBuilder: { show: showAgentBuilder },
          dashboard_v2: { showWriteControls: true },
        },
      },
      chrome: {},
    } as unknown as CoreStart);

  const createStartDependencies = () =>
    ({
      agentBuilder: {
        openChat,
        getAgentBuilderAccess: jest.fn(),
      },
      dashboard: {},
      share: {
        url: {
          locators: {
            get: jest.fn(),
          },
        },
      },
      uiActions: {
        registerActionAsync,
        attachAction,
      },
    } as unknown as AgentBuilderDashboardsPluginPublicStartDependencies);

  beforeEach(() => {
    registerActionAsync.mockClear();
    attachAction.mockClear();
    registerEmbeddablePublicDefinition.mockClear();
    openChat.mockClear();
  });

  it('registers the AI insights embeddable in setup', () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);
    plugin.setup({} as never, {
      embeddable: { registerEmbeddablePublicDefinition },
    } as unknown as AgentBuilderDashboardsPluginPublicSetupDependencies);

    expect(registerEmbeddablePublicDefinition).toHaveBeenCalledWith(
      'ai_insights',
      expect.any(Function)
    );
  });

  it('registers add-panel action and chat entry points when Agent Builder is available', async () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(true), createStartDependencies());

    expect(registerActionAsync).toHaveBeenCalledWith(
      ADD_AI_INSIGHTS_ACTION_ID,
      expect.any(Function)
    );
    expect(attachAction).toHaveBeenCalled();
    expect(registerActionAsync).toHaveBeenCalledWith(
      OPEN_DASHBOARD_CHAT_ACTION_ID,
      expect.any(Function)
    );
    expect(registerActionAsync).toHaveBeenCalledWith(
      ENHANCE_DASHBOARD_ACTION_ID,
      expect.any(Function)
    );

    const openChatFactory = registerActionAsync.mock.calls.find(
      ([id]) => id === OPEN_DASHBOARD_CHAT_ACTION_ID
    )?.[1];
    const openChatAction = await openChatFactory();
    expect(openChatAction.id).toBe(OPEN_DASHBOARD_CHAT_ACTION_ID);

    await openChatAction.execute({
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });
    expect(openChat).toHaveBeenCalled();
  });

  it('still registers the AI insights add-panel action without Agent Builder capabilities', () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(false), createStartDependencies());

    expect(registerActionAsync).toHaveBeenCalledWith(
      ADD_AI_INSIGHTS_ACTION_ID,
      expect.any(Function)
    );
    expect(registerActionAsync).not.toHaveBeenCalledWith(
      OPEN_DASHBOARD_CHAT_ACTION_ID,
      expect.any(Function)
    );
  });
});
