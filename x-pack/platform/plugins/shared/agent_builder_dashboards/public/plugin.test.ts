/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { AgentBuilderDashboardsPlugin } from './plugin';
import type { AgentBuilderDashboardsPluginPublicStartDependencies } from './types';

jest.mock('./attachment_types', () => ({
  registerDashboardAttachmentUiDefinition: jest.fn(() => jest.fn()),
}));

describe('AgentBuilderDashboardsPlugin', () => {
  const addTriggerActionAsync = jest.fn();
  const registerActionAsync = jest.fn();

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
      agentBuilder: { openChat: jest.fn() },
      dashboard: {},
      share: {
        url: {
          locators: {
            get: jest.fn(),
          },
        },
      },
      uiActions: {
        addTriggerActionAsync,
        registerActionAsync,
      },
    } as unknown as AgentBuilderDashboardsPluginPublicStartDependencies);

  beforeEach(() => {
    addTriggerActionAsync.mockClear();
    registerActionAsync.mockClear();
  });

  it('registers the dashboard Chat entry points when Agent Builder is available', () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(true), createStartDependencies());

    expect(addTriggerActionAsync).toHaveBeenCalledTimes(1);
    expect(registerActionAsync).toHaveBeenCalledWith('openDashboardChat', expect.any(Function));
  });

  it('does not register dashboard Chat entry points without Agent Builder capabilities', () => {
    const plugin = new AgentBuilderDashboardsPlugin({} as PluginInitializerContext);

    plugin.start(createCoreStart(false), createStartDependencies());

    expect(addTriggerActionAsync).not.toHaveBeenCalled();
    expect(registerActionAsync).not.toHaveBeenCalled();
  });
});
