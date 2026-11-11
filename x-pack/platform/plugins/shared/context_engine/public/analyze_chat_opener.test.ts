/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { createAnalyzeChatOpener } from './analyze_chat_opener';
import type { AnalyzeAndImproveContext, AnalyzeChatOptions } from './types';

const analyzeOptions = async (ctx: AnalyzeAndImproveContext): Promise<AnalyzeChatOptions> => ({
  agentId: ctx.aiIndex.feedback_analysis?.agent_id,
  newConversation: true,
  sessionTag: `context-engine-feedback:${ctx.aiIndex.id}`,
  attachments: [
    {
      id: `context-engine-ai-index:${ctx.aiIndex.id}`,
      type: 'text',
      data: { content: `AI index: ${ctx.aiIndex.id}` },
    },
  ],
});

const context = (feedbackAgentId?: string): AnalyzeAndImproveContext =>
  ({
    aiIndex: { id: 'idx-1', feedback_analysis: { enabled: false, agent_id: feedbackAgentId } },
  } as AnalyzeAndImproveContext);

const coreWithCapability = (show: boolean | undefined) => {
  const core = coreMock.createStart();
  (core.application as { capabilities: Record<string, unknown> }).capabilities = {
    ...core.application.capabilities,
    agentBuilder: show === undefined ? undefined : { show },
  };
  return core;
};

const mockAgentBuilder = (
  overrides: Partial<AgentBuilderPluginStart> = {}
): AgentBuilderPluginStart =>
  ({
    openChat: jest.fn(),
    getAgentBuilderAccess: jest.fn(async () => ({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    })),
    ...overrides,
  } as AgentBuilderPluginStart);

describe('createAnalyzeChatOpener', () => {
  it('returns undefined when Agent Builder is absent', () => {
    expect(
      createAnalyzeChatOpener({
        coreStart: coreWithCapability(true),
        agentBuilder: undefined,
        buildAnalyzeChat: analyzeOptions,
      })
    ).toBeUndefined();
  });

  it('returns undefined when the agentBuilder.show capability is absent', () => {
    expect(
      createAnalyzeChatOpener({
        coreStart: coreWithCapability(false),
        agentBuilder: mockAgentBuilder(),
        buildAnalyzeChat: analyzeOptions,
      })
    ).toBeUndefined();
  });

  it('forwards buildAnalyzeChat options to openChat when access is granted', async () => {
    const agentBuilder = mockAgentBuilder();
    const opener = createAnalyzeChatOpener({
      coreStart: coreWithCapability(true),
      agentBuilder,
      buildAnalyzeChat: analyzeOptions,
    });

    await opener!(context('agent-x'));

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      agentId: 'agent-x',
      newConversation: true,
      sessionTag: 'context-engine-feedback:idx-1',
      attachments: [
        {
          id: 'context-engine-ai-index:idx-1',
          type: 'text',
          data: { content: 'AI index: idx-1' },
        },
      ],
    });
  });

  it('does not open a chat (and warns) when Agent Builder runtime access is unavailable', async () => {
    const coreStart = coreWithCapability(true);
    const agentBuilder = mockAgentBuilder({
      getAgentBuilderAccess: jest.fn(async () => ({
        hasRequiredLicense: false,
        hasLlmConnector: true,
      })),
    });
    const opener = createAnalyzeChatOpener({
      coreStart,
      agentBuilder,
      buildAnalyzeChat: analyzeOptions,
    });

    await opener!(context('agent-x'));

    expect(agentBuilder.openChat).not.toHaveBeenCalled();
    expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it('does not open a chat when the index has no configured feedback agent', async () => {
    const agentBuilder = mockAgentBuilder();
    const opener = createAnalyzeChatOpener({
      coreStart: coreWithCapability(true),
      agentBuilder,
      buildAnalyzeChat: analyzeOptions,
    });

    await opener!(context(undefined));

    expect(agentBuilder.openChat).not.toHaveBeenCalled();
  });
});
