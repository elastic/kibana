/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType, ToolResultType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { coreMock } from '@kbn/core/public/mocks';
import type { GetAiIndexResponse } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { BehaviorSubject, Subject } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../common/agent_builder_attachments';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
} from '../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../common/agent_builder_tools';
import { createSuggestAutomationProvider } from './create_suggest_automation_provider';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  description: 'Support tickets',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [{ type: 'workflow', value: 'wf-existing' }],
  sources: [{ type: 'esql', value: 'FROM tickets' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const createProvider = ({
  hasAgentBuilder = true,
  hasPrivilege = true,
}: {
  hasAgentBuilder?: boolean;
  hasPrivilege?: boolean;
} = {}) => {
  const openChat = jest.fn();
  const activeConversation$ = new BehaviorSubject<{ id?: string } | null>({
    id: 'conversation-1',
  });
  const chatEvents$ = new Subject<{
    type: ChatEventType;
    data: Record<string, unknown>;
  }>();
  const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);

  const agentBuilder = hasAgentBuilder
    ? ({
        openChat,
        events: {
          ui: { activeConversation$ },
          getChatEvents$,
        },
      } as unknown as AgentBuilderPluginStart)
    : undefined;

  const application = coreMock.createStart().application;
  application.capabilities = {
    ...application.capabilities,
    agentBuilder: { show: hasPrivilege },
  };

  const provider = createSuggestAutomationProvider({ agentBuilder, application });

  return { provider, openChat, chatEvents$, getChatEvents$ };
};

describe('createSuggestAutomationProvider', () => {
  it('returns canSuggest false when agent builder is unavailable', () => {
    const { provider } = createProvider({ hasAgentBuilder: false });

    expect(provider.canSuggest({ aiIndex, isManaged: false })).toBe(false);
  });

  it('returns canSuggest false for managed AI indexes', () => {
    const { provider } = createProvider();

    expect(provider.canSuggest({ aiIndex, isManaged: true })).toBe(false);
  });

  it('returns canSuggest false when ai index is undefined', () => {
    const { provider } = createProvider();

    expect(provider.canSuggest({ aiIndex: undefined, isManaged: false })).toBe(false);
  });

  it('returns canSuggest false without agent builder privilege', () => {
    const { provider } = createProvider({ hasPrivilege: false });

    expect(provider.canSuggest({ aiIndex, isManaged: false })).toBe(false);
  });

  it('opens agent builder chat with the AI index attachment', () => {
    const { provider, openChat } = createProvider();

    provider.suggestAutomation({ aiIndex, onSaved: jest.fn() });

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSendInitialMessage: false,
        initialMessage: expect.stringMatching(
          new RegExp(
            `\\[\\/${ANALYZE_AND_IMPROVE_SKILL_ID}\\]\\(skill://${ANALYZE_AND_IMPROVE_SKILL_ID}\\).*suggest an automation`,
            's'
          )
        ),
        sessionTag: 'context-engine-ai-index-my-ai-index',
        attachments: [
          expect.objectContaining({
            id: 'my-ai-index',
            type: AI_INDEX_ATTACHMENT_TYPE,
            data: {
              id: 'my-ai-index',
              description: 'Support tickets',
              dest: aiIndex.dest,
              sources: aiIndex.sources,
              automations: aiIndex.automations,
            },
          }),
        ],
      })
    );
  });

  it('opens guided setup with the same attachment but a setup brief', () => {
    const { provider, openChat } = createProvider();

    provider.startGuidedSetup({ aiIndex, onSaved: jest.fn() });

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSendInitialMessage: false,
        initialMessage: expect.stringMatching(
          new RegExp(
            `\\[\\/${ANALYZE_AND_IMPROVE_SKILL_ID}\\]\\(skill://${ANALYZE_AND_IMPROVE_SKILL_ID}\\).*help me set up`,
            's'
          )
        ),
        sessionTag: 'context-engine-ai-index-my-ai-index',
        attachments: [
          expect.objectContaining({ id: 'my-ai-index', type: AI_INDEX_ATTACHMENT_TYPE }),
        ],
      })
    );
  });

  it('resumes the thread already going about this index rather than starting a new one', () => {
    const { provider, openChat } = createProvider();

    provider.startGuidedSetup({ aiIndex, onSaved: jest.fn() });
    provider.suggestAutomation({ aiIndex, onSaved: jest.fn() });

    for (const [options] of openChat.mock.calls) {
      expect(options.newConversation).toBeUndefined();
      expect(options.sessionTag).toBe('context-engine-ai-index-my-ai-index');
    }
  });

  it.each([
    ['suggestAutomation' as const, [AI_INDEX_AUTOMATIONS_SKILL_ID]],
    ['startGuidedSetup' as const, [AI_INDEX_SOURCES_SKILL_ID, AI_INDEX_AUTOMATIONS_SKILL_ID]],
  ])('asks %s for the skills that carry the tools it needs', (method, skillIds) => {
    // `analyze-and-improve` is read-only. Both buttons exist to produce an automation, so the
    // brief names the writing skills up front instead of leaving the agent to discover midway
    // that it cannot author one.
    const { provider, openChat } = createProvider();

    provider[method]({ aiIndex, onSaved: jest.fn() });

    const { initialMessage } = openChat.mock.calls[0][0];
    for (const skillId of skillIds) {
      expect(initialMessage).toContain(`skill://${skillId}`);
    }
  });

  it('asks the agent to work out the sources rather than having the user name them', () => {
    // Creation no longer collects sources, so the brief has to send the agent looking for them.
    const { provider, openChat } = createProvider();

    provider.startGuidedSetup({ aiIndex, onSaved: jest.fn() });

    const [{ initialMessage }] = openChat.mock.calls[0];
    expect(initialMessage).toMatch(/no sources yet/i);
    expect(initialMessage).toMatch(/indices or connectors/i);
  });

  it('refreshes the page when save automation succeeds for the current AI index', () => {
    const onSaved = jest.fn();
    const { provider, chatEvents$, getChatEvents$ } = createProvider();

    const unsubscribe = provider.subscribeToAutomationSaved('my-ai-index', onSaved);

    expect(getChatEvents$).toHaveBeenCalledWith('conversation-1');

    chatEvents$.next({
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: 'tool-call-1',
        tool_id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
        results: [
          {
            tool_result_id: 'result-1',
            type: ToolResultType.other,
            data: {
              aiIndexId: 'my-ai-index',
              workflowId: 'wf-new',
              status: 'attached',
            },
          },
        ],
      },
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('refreshes the page when save automation persists and attaches for the current AI index', () => {
    const onSaved = jest.fn();
    const { provider, chatEvents$ } = createProvider();

    provider.subscribeToAutomationSaved('my-ai-index', onSaved);

    chatEvents$.next({
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: 'tool-call-2',
        tool_id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
        results: [
          {
            tool_result_id: 'result-2',
            type: ToolResultType.other,
            data: {
              aiIndexId: 'my-ai-index',
              workflowId: 'wf-new',
              status: 'saved_and_attached',
            },
          },
        ],
      },
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when save automation fails', () => {
    const onSaved = jest.fn();
    const { provider, chatEvents$ } = createProvider();

    provider.subscribeToAutomationSaved('my-ai-index', onSaved);

    chatEvents$.next({
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: 'tool-call-1',
        tool_id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
        results: [
          {
            tool_result_id: 'result-1',
            type: ToolResultType.error,
            data: {
              message: 'Failed to save workflow automation',
            },
          },
        ],
      },
    });

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not refresh when save automation succeeds for a different AI index', () => {
    const onSaved = jest.fn();
    const { provider, chatEvents$ } = createProvider();

    provider.subscribeToAutomationSaved('my-ai-index', onSaved);

    chatEvents$.next({
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: 'tool-call-1',
        tool_id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
        results: [
          {
            tool_result_id: 'result-1',
            type: ToolResultType.other,
            data: {
              aiIndexId: 'other-ai-index',
              workflowId: 'wf-new',
              status: 'attached',
            },
          },
        ],
      },
    });

    expect(onSaved).not.toHaveBeenCalled();
  });
});
