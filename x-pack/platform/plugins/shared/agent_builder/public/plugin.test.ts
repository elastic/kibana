/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateOriginResponse } from '@kbn/agent-builder-common/attachments';
import type { PluginInitializerContext } from '@kbn/core/public';
import { of } from 'rxjs';
import { AgentBuilderPlugin } from './plugin';
import { AttachmentsService } from './services';
import { clearSidebarRuntimeContext, sidebarRuntimeContext$ } from './sidebar';

jest.mock('./application/components/attachments/visualization_attachment', () => ({
  createVisualizationAttachmentDefinition: jest.fn(() => ({})),
}));

const createPluginContext = () =>
  ({
    logger: {
      get: () => ({}),
    },
  } as unknown as PluginInitializerContext);

const createCoreStart = () => {
  const sidebar = {
    open: jest.fn(),
    close: jest.fn(),
  };

  return {
    http: {},
    uiSettings: {
      get$: jest.fn().mockReturnValue(of(false)),
    },
    application: {
      capabilities: {
        agentBuilder: {
          show: false,
        },
      },
    },
    chrome: {
      sidebar: {
        getApp: jest.fn(() => sidebar),
      },
      navControls: {
        registerRight: jest.fn(),
      },
    },
    docLinks: {
      links: {
        agentBuilder: {
          agentBuilder: '/agent-builder',
          getStarted: '/agent-builder/get-started',
          models: '/agent-builder/models',
          chat: '/agent-builder/chat',
          agentBuilderAgents: '/agent-builder/agents',
          tools: '/agent-builder/tools',
          programmaticAccess: '/agent-builder/programmatic-access',
          kibanaApi: '/agent-builder/kibana-api',
          mcpServer: '/agent-builder/mcp-server',
          a2aServer: '/agent-builder/a2a-server',
          limitationsKnownIssues: '/agent-builder/limitations',
        },
      },
    },
  };
};

const createStartDependencies = () =>
  ({
    licensing: {},
    inference: {},
  } as const);

const createPlugin = () => {
  const plugin = new AgentBuilderPlugin(createPluginContext());
  (plugin as any).setupServices = {
    navigationService: {},
  };
  return plugin;
};

const registerSidebarCallbacks = ({
  invalidateConversation,
}: {
  invalidateConversation?: jest.Mock;
}) => {
  sidebarRuntimeContext$.getValue()?.onRegisterCallbacks?.({
    updateProps: jest.fn(),
    resetBrowserApiTools: jest.fn(),
    addAttachment: jest.fn(),
    invalidateConversation: invalidateConversation ?? jest.fn(),
  });
};

describe('AgentBuilderPlugin', () => {
  afterEach(() => {
    clearSidebarRuntimeContext();
    jest.restoreAllMocks();
  });

  describe('updateAttachmentOrigin', () => {
    it('uses the explicit conversation id and invalidates the matching active sidebar conversation', async () => {
      const response = {
        success: true,
        attachment: {
          id: 'attachment-1',
          type: 'dashboard',
          versions: [],
          current_version: 1,
          hidden: false,
        },
      } as unknown as UpdateOriginResponse;
      const updateOrigin = jest
        .spyOn(AttachmentsService.prototype, 'updateOrigin')
        .mockResolvedValue(response);
      const invalidateConversation = jest.fn();
      const plugin = createPlugin();
      const service = plugin.start(createCoreStart() as any, createStartDependencies() as any);

      service.openChat();
      sidebarRuntimeContext$.getValue()?.onConversationChange?.({ id: 'conversation-1' });
      registerSidebarCallbacks({
        invalidateConversation,
      });

      await expect(
        service.updateAttachmentOrigin('conversation-1', 'attachment-1', 'saved-dashboard-id')
      ).resolves.toBe(response);

      expect(updateOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-1',
        'saved-dashboard-id'
      );
      expect(invalidateConversation).toHaveBeenCalledTimes(1);
    });

    it('does not invalidate when the active sidebar is bound to a different conversation', async () => {
      const response = {
        success: true,
        attachment: {
          id: 'attachment-1',
          type: 'dashboard',
          versions: [],
          current_version: 1,
          hidden: false,
        },
      } as unknown as UpdateOriginResponse;
      const updateOrigin = jest
        .spyOn(AttachmentsService.prototype, 'updateOrigin')
        .mockResolvedValue(response);
      const invalidateConversation = jest.fn();
      const plugin = createPlugin();
      const service = plugin.start(createCoreStart() as any, createStartDependencies() as any);

      service.openChat();
      sidebarRuntimeContext$.getValue()?.onConversationChange?.({ id: 'other-conversation' });
      registerSidebarCallbacks({
        invalidateConversation,
      });

      await expect(
        service.updateAttachmentOrigin('conversation-1', 'attachment-1', 'saved-dashboard-id')
      ).resolves.toBe(response);

      expect(updateOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-1',
        'saved-dashboard-id'
      );
      expect(invalidateConversation).not.toHaveBeenCalled();
    });

    it('returns the backend response even when no sidebar is open', async () => {
      const response = {
        success: true,
        attachment: {
          id: 'attachment-1',
          type: 'dashboard',
          versions: [],
          current_version: 1,
          hidden: false,
        },
      } as unknown as UpdateOriginResponse;
      const updateOrigin = jest
        .spyOn(AttachmentsService.prototype, 'updateOrigin')
        .mockResolvedValue(response);
      const plugin = createPlugin();
      const service = plugin.start(createCoreStart() as any, createStartDependencies() as any);

      await expect(
        service.updateAttachmentOrigin('conversation-1', 'attachment-1', 'saved-dashboard-id')
      ).resolves.toBe(response);

      expect(updateOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-1',
        'saved-dashboard-id'
      );
    });
  });

  describe('subscribeToConversationChanges', () => {
    it('replays the latest conversation binding and supports unsubscribe', () => {
      const plugin = createPlugin();
      const service = plugin.start(createCoreStart() as any, createStartDependencies() as any);
      const firstListener = jest.fn();
      const secondListener = jest.fn();

      service.openChat();

      const runtimeContext = sidebarRuntimeContext$.getValue();
      expect(runtimeContext?.onConversationChange).toEqual(expect.any(Function));

      const unsubscribeFirst = service.subscribeToConversationChanges(firstListener);
      runtimeContext?.onConversationChange?.({ id: 'conversation-1' });

      expect(firstListener).toHaveBeenCalledWith({ id: 'conversation-1' });

      const unsubscribeSecond = service.subscribeToConversationChanges(secondListener);
      expect(secondListener).toHaveBeenCalledWith({ id: 'conversation-1' });

      unsubscribeSecond();
      runtimeContext?.onConversationChange?.({ id: 'conversation-2' });

      expect(secondListener).toHaveBeenCalledTimes(1);
      expect(firstListener).toHaveBeenLastCalledWith({ id: 'conversation-2' });

      unsubscribeFirst();
    });
  });

  describe('sidebarOpen$', () => {
    it('emits sidebar open state changes', () => {
      const plugin = createPlugin();
      const service = plugin.start(createCoreStart() as any, createStartDependencies() as any);
      const states: boolean[] = [];
      const subscription = service.events.ui.sidebarOpen$.subscribe((isOpen) => {
        states.push(isOpen);
      });

      expect(states).toEqual([false]);

      service.openChat();
      expect(states).toEqual([false, true]);

      service.toggleChat();
      expect(states).toEqual([false, true, false]);

      subscription.unsubscribe();
    });
  });
});
