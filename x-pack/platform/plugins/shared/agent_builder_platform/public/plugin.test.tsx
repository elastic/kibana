/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { registerAttachmentUiDefinitions } from './attachment_types';
import { AgentBuilderPlatformPlugin } from './plugin';
import type { PluginStartDependencies } from './types';

jest.mock('./attachment_types', () => ({ registerAttachmentUiDefinitions: jest.fn() }));

const mockRegisterAttachmentUi = jest.mocked(registerAttachmentUiDefinitions);

type CtxOpener = (ctx: {
  aiIndex: { id: string; feedback_agent_id?: string };
  tag?: string;
}) => void | Promise<void>;

const analyzeOptions = (ctx: { aiIndex: { id: string; feedback_agent_id?: string } }) => ({
  agentId: ctx.aiIndex.feedback_agent_id,
  newConversation: true,
  sessionTag: `context-engine-feedback:${ctx.aiIndex.id}`,
  attachments: [
    {
      id: `platform.context_engine.ai_index.${ctx.aiIndex.id}`,
      type: 'platform.context_engine.ai_index',
      data: ctx.aiIndex,
    },
  ],
});

const buildStartDeps = (
  overrides: Partial<PluginStartDependencies> = {}
): PluginStartDependencies => {
  const openChat = jest.fn();
  const registerChatOpener = jest.fn();
  const getAgentBuilderAccess = jest.fn(async () => ({
    hasRequiredLicense: true,
    hasLlmConnector: true,
  }));
  return {
    agentBuilder: {
      openChat,
      getAgentBuilderAccess,
      attachments: {},
      agents: {},
    },
    share: { url: { locators: {} } },
    triggersActionsUi: {},
    ...overrides,
    // Distinguish "not provided" (default a stub CE contract) from an explicit `undefined` (CE absent).
    contextEngine:
      'contextEngine' in overrides
        ? overrides.contextEngine
        : { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) },
  } as any;
};

// Core start with the `agentBuilder.show` capability set to the given value (undefined = section absent).
const coreWithCapability = (show: boolean | undefined) => {
  const core = coreMock.createStart();
  (core.application as any).capabilities = {
    ...core.application.capabilities,
    agentBuilder: show === undefined ? undefined : { show },
  };
  return core;
};

describe('AgentBuilderPlatformPlugin (browser bridge)', () => {
  afterEach(() => jest.clearAllMocks());

  it('registers the chat opener BEFORE the attachment UI definitions when the user has access', () => {
    const order: string[] = [];
    const registerChatOpener = jest.fn(() => order.push('opener'));
    mockRegisterAttachmentUi.mockImplementation(() => {
      order.push('attachmentUi');
    });

    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({
      contextEngine: { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) } as any,
    });

    plugin.start(coreWithCapability(true), startDeps);

    expect(registerChatOpener).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['opener', 'attachmentUi']);
  });

  it('does NOT register the opener when the agentBuilder.show capability is absent, but still registers the attachment UI', () => {
    const registerChatOpener = jest.fn();
    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({
      contextEngine: { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) } as any,
    });

    plugin.start(coreWithCapability(false), startDeps);

    expect(registerChatOpener).not.toHaveBeenCalled();
    expect(mockRegisterAttachmentUi).toHaveBeenCalledTimes(1);
  });

  it('forwards buildAnalyzeChat options (new per-index conversation) to openChat when access is granted', async () => {
    const openChat = jest.fn();
    let capturedOpener: CtxOpener | undefined;
    const registerChatOpener = jest.fn((opener) => {
      capturedOpener = opener;
    });

    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({
      agentBuilder: {
        openChat,
        getAgentBuilderAccess: jest.fn(async () => ({
          hasRequiredLicense: true,
          hasLlmConnector: true,
        })),
        attachments: {},
        agents: {},
      } as any,
      contextEngine: { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) } as any,
    });

    plugin.start(coreWithCapability(true), startDeps);

    const aiIndex = { id: 'idx-1', feedback_agent_id: 'agent-x' };
    await capturedOpener!({ aiIndex });

    expect(openChat).toHaveBeenCalledWith({
      agentId: 'agent-x',
      newConversation: true,
      sessionTag: 'context-engine-feedback:idx-1',
      attachments: [
        {
          id: 'platform.context_engine.ai_index.idx-1',
          type: 'platform.context_engine.ai_index',
          data: aiIndex,
        },
      ],
    });
  });

  it('does not open a chat (and warns) when Agent Builder runtime access is unavailable', async () => {
    const openChat = jest.fn();
    let capturedOpener: CtxOpener | undefined;
    const registerChatOpener = jest.fn((opener) => {
      capturedOpener = opener;
    });
    const core = coreWithCapability(true);

    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({
      agentBuilder: {
        openChat,
        getAgentBuilderAccess: jest.fn(async () => ({
          hasRequiredLicense: false,
          hasLlmConnector: true,
        })),
        attachments: {},
        agents: {},
      } as any,
      contextEngine: { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) } as any,
    });

    plugin.start(core, startDeps);
    await capturedOpener!({ aiIndex: { id: 'idx-1', feedback_agent_id: 'agent-x' } });

    expect(openChat).not.toHaveBeenCalled();
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it('does not open a chat when the index has no configured feedback agent', async () => {
    const openChat = jest.fn();
    let capturedOpener: CtxOpener | undefined;
    const registerChatOpener = jest.fn((opener) => {
      capturedOpener = opener;
    });

    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({
      agentBuilder: {
        openChat,
        getAgentBuilderAccess: jest.fn(async () => ({
          hasRequiredLicense: true,
          hasLlmConnector: true,
        })),
        attachments: {},
        agents: {},
      } as any,
      contextEngine: { registerChatOpener, buildAnalyzeChat: jest.fn(analyzeOptions) } as any,
    });

    plugin.start(coreWithCapability(true), startDeps);
    await capturedOpener!({ aiIndex: { id: 'idx-1' } }); // no feedback_agent_id

    expect(openChat).not.toHaveBeenCalled();
  });

  it('does not throw and still registers the attachment UI when Context Engine is absent', () => {
    const plugin = new AgentBuilderPlatformPlugin();
    const startDeps = buildStartDeps({ contextEngine: undefined });

    expect(() => plugin.start(coreWithCapability(true), startDeps)).not.toThrow();
    expect(mockRegisterAttachmentUi).toHaveBeenCalledTimes(1);
  });
});
