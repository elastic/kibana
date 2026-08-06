/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType, ToolResultType } from '@kbn/agent-builder-common';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../common/agent_builder_tools';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { ContextEngineServices } from './use_kibana';
import { useSuggestAutomation } from './use_suggest_automation';

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

const renderSuggestHook = ({
  aiIndex: index = aiIndex,
  isManaged = false,
  hasAgentBuilder = true,
  hasPrivilege = true,
  onSaved = jest.fn(),
}: {
  aiIndex?: GetAiIndexResponse;
  isManaged?: boolean;
  hasAgentBuilder?: boolean;
  hasPrivilege?: boolean;
  onSaved?: jest.Mock;
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

  const services = {
    ...coreMock.createStart(),
    share: {} as ContextEngineServices['share'],
    triggersActionsUi: {} as ContextEngineServices['triggersActionsUi'],
    agentBuilder: hasAgentBuilder
      ? {
          openChat,
          events: {
            ui: { activeConversation$ },
            getChatEvents$,
          },
        }
      : undefined,
  } as unknown as ContextEngineServices;

  services.application.capabilities = {
    ...services.application.capabilities,
    agentBuilder: { show: hasPrivilege },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    </I18nProvider>
  );

  const view = renderHook(() => useSuggestAutomation({ aiIndex: index, isManaged, onSaved }), {
    wrapper,
  });

  return { ...view, services, chatEvents$, onSaved, getChatEvents$ };
};

describe('useSuggestAutomation', () => {
  it('returns canSuggest false when agent builder is unavailable', () => {
    const { result } = renderSuggestHook({ hasAgentBuilder: false });

    expect(result.current.canSuggest).toBe(false);
  });

  it('returns canSuggest false for managed AI indexes', () => {
    const { result } = renderSuggestHook({ isManaged: true });

    expect(result.current.canSuggest).toBe(false);
  });

  it('returns canSuggest false without agent builder privilege', () => {
    const { result } = renderSuggestHook({ hasPrivilege: false });

    expect(result.current.canSuggest).toBe(false);
  });

  it('opens agent builder chat with the AI index attachment', () => {
    const { result, services } = renderSuggestHook();
    const openChat = services.agentBuilder?.openChat;

    result.current.suggestAutomation();

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: false,
        initialMessage: expect.stringContaining(
          '[/ki-automation-generation](skill://ki-automation-generation)'
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

  it('refreshes the page when save automation succeeds for the current AI index', () => {
    const { chatEvents$, onSaved, getChatEvents$ } = renderSuggestHook();

    expect(getChatEvents$).toHaveBeenCalledWith('conversation-1');

    act(() => {
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
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('refreshes the page when save automation persists and attaches for the current AI index', () => {
    const { chatEvents$, onSaved } = renderSuggestHook();

    act(() => {
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
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when save automation fails', () => {
    const { chatEvents$, onSaved } = renderSuggestHook();

    act(() => {
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
    });

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not refresh when save automation succeeds for a different AI index', () => {
    const { chatEvents$, onSaved } = renderSuggestHook();

    act(() => {
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
    });

    expect(onSaved).not.toHaveBeenCalled();
  });
});
