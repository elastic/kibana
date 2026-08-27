/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  PRETTIFY_DASHBOARD_ACTION_ID,
} from '@kbn/dashboard-plugin/public';
import { AgentBuilderDashboardsPlugin } from './plugin';
import type { AgentBuilderDashboardsPluginPublicStartDependencies } from './types';

jest.mock('./attachment_types', () => ({
  registerDashboardAttachmentUiDefinition: jest.fn(() => jest.fn()),
  createIdGenerator: () => ({
    current: 'draft-id',
    next: jest.fn(),
  }),
}));

describe('AgentBuilderDashboardsPlugin', () => {
  const registerActionAsync = jest.fn();
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
      },
    } as unknown as AgentBuilderDashboardsPluginPublicStartDependencies);

  beforeEach(() => {
    registerActionAsync.mockClear();
    openChat.mockClear();
  });

  it('registers lazy chat and prettify actions when Agent Builder is available', async () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(true), createStartDependencies());

    expect(registerActionAsync).toHaveBeenCalledWith(
      OPEN_DASHBOARD_CHAT_ACTION_ID,
      expect.any(Function)
    );
    expect(registerActionAsync).toHaveBeenCalledWith(
      PRETTIFY_DASHBOARD_ACTION_ID,
      expect.any(Function)
    );

    const openChatAction = await registerActionAsync.mock.calls[0][1]();
    expect(openChatAction.id).toBe(OPEN_DASHBOARD_CHAT_ACTION_ID);

    await openChatAction.execute({
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });
    expect(openChat).toHaveBeenCalled();

    const prettifyAction = await registerActionAsync.mock.calls[1][1]();
    expect(prettifyAction.id).toBe(PRETTIFY_DASHBOARD_ACTION_ID);
  });

  it('does not register dashboard Chat entry points without Agent Builder capabilities', () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(false), createStartDependencies());

    expect(registerActionAsync).not.toHaveBeenCalled();
  });
});
