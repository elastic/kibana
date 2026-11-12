/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  TimelineEventType,
  isAttachmentEvent,
  isTimelineEvent,
  isToolCallStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ChatResponse } from '../../../../../common/http_api/chat';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallToolThenAnswer,
  setupAgentDirectAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import {
  apiTest,
  API_AGENT_BUILDER,
  getConversation,
  postConverse,
  type ExecutionMode,
} from '../fixtures';

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

interface WireMessage {
  role: string;
  content?: unknown;
  tool_call_id?: string;
}

const messageText = ({ content }: WireMessage): string =>
  Array.isArray(content)
    ? content.map((part: { text?: string }) => part.text ?? '').join('')
    : String(content ?? '');

/** The message the model got right after the given tool call's result. */
const messageAfterToolResult = (messages: WireMessage[], toolCallId: string): WireMessage => {
  const toolResultIndex = messages.findIndex(
    (message) => message.role === 'tool' && message.tool_call_id === toolCallId
  );
  expect(toolResultIndex).toBeGreaterThan(-1);
  return messages[toolResultIndex + 1];
};

apiTest.describe(
  'Agent Builder — converse tool attachment events API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    for (const mode of EXECUTION_MODES) {
      apiTest(
        `[${mode}] an attachment added by a tool is stored after its step and shown after its result`,
        async ({ apiClient }) => {
          setupAgentCallToolThenAnswer({
            proxy: llmProxy,
            toolName: 'attachments_add',
            toolArg: {
              type: 'text',
              data: { content: 'Note written by the tool' },
              description: 'Tool note',
            },
            response: 'Saved the note',
          });
          const first = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: 'Save a note', connector_id: connectorId },
            mode
          );
          expect(first).toHaveStatusCode(200);
          const firstBody = first.body as ChatResponse;
          conversationIds.push(firstBody.conversation_id);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const [toolStep] = firstBody.steps.filter(
            (step): step is ToolCallStep => step.type === ConversationRoundStepType.toolCall
          );
          expect(toolStep.tool_id).toBe('attachments.add');
          const toolCallId = toolStep.tool_call_id;

          // during the run: the notice follows the tool result
          const duringRun = llmProxy.interceptedRequests.find(
            (request) => request.matchingInterceptorName === 'final-assistant-response'
          )!.requestBody.messages as WireMessage[];
          const noticeDuringRun = messageAfterToolResult(duringRun, toolCallId);
          expect(noticeDuringRun.role).toBe('user');
          expect(messageText(noticeDuringRun)).toContain(
            '<conversation_event type="attachment_added"'
          );
          expect(messageText(noticeDuringRun)).toContain('description="Tool note"');
          expect(messageText(noticeDuringRun)).toContain('source="execution"');

          // stored: linked to its tool call and execution, right after the call's step
          const { events = [] } = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            firstBody.conversation_id
          );
          const stepIndex = events.findIndex(
            (event) =>
              isTimelineEvent(event) &&
              event.type === TimelineEventType.executionStep &&
              isToolCallStep(event.data.step) &&
              event.data.step.tool_call_id === toolCallId
          );
          const attachmentIndex = events.findIndex(
            (event) =>
              isAttachmentEvent(event) &&
              event.type === TimelineEventType.attachmentAdded &&
              event.data.tool_call_id === toolCallId
          );
          const terminalIndex = events.findIndex(
            (event) => event.type === TimelineEventType.executionTerminated
          );
          expect(stepIndex).toBeGreaterThan(-1);
          expect(attachmentIndex).toBe(stepIndex + 1);
          expect(attachmentIndex).toBeLessThan(terminalIndex);
          const attachmentEvent = events[attachmentIndex];
          expect(attachmentEvent.execution_id).toBe(events[stepIndex].execution_id);
          expect(attachmentEvent.data).toMatchObject({
            attachment_type: 'text',
            source: 'execution',
            tool_call_id: toolCallId,
            description: 'Tool note',
            format: 2,
          });

          // next turn: the same notice, rendered from the stored event, at the same place
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: 'Anything else?',
          });
          const requestsBeforeSecondTurn = llmProxy.interceptedRequests.length;
          const second = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            {
              input: 'Thanks',
              conversation_id: firstBody.conversation_id,
              connector_id: connectorId,
            },
            mode
          );
          expect(second).toHaveStatusCode(200);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const nextTurn = llmProxy.interceptedRequests
            .slice(requestsBeforeSecondTurn)
            .find((request) => request.matchingInterceptorName === 'final-assistant-response')!
            .requestBody.messages as WireMessage[];
          const noticeNextTurn = messageAfterToolResult(nextTurn, toolCallId);
          expect(noticeNextTurn.role).toBe('user');
          expect(messageText(noticeNextTurn)).toBe(messageText(noticeDuringRun));
        }
      );
    }
  }
);
