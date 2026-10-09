/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ConversationAccessControlMode, type Conversation } from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest, API_AGENT_BUILDER, ELASTIC_API_VERSION } from '../fixtures';

const VERSION_HEADERS = { 'elastic-api-version': ELASTIC_API_VERSION };

interface WorkflowExecution {
  status?: ExecutionStatus;
  stepExecutions?: Array<{
    stepId: string;
    output?: { message?: string; conversation_id?: string };
  }>;
}
const WORKFLOW_ID = `ephemeral-ai-agent-${Date.now()}`;

const workflowYaml = ({
  connectorId,
  conversationId,
}: {
  connectorId: string;
  conversationId: string;
}) => `name: ephemeral ai.agent e2e
enabled: true
triggers:
  - type: manual
steps:
  - name: summarize
    type: ai.agent
    connector-id: "${connectorId}"
    ephemeral: true
    with:
      conversation_id: "${conversationId}"
      message: "Summarize this conversation."
`;

apiTest.describe(
  'Agent Builder — ephemeral ai.agent workflow step',
  { tag: tags.local.stateful.classic },
  () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    let conversationId: string | undefined;

    apiTest.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      await asAdmin.delete('api/workflows?force=true', {
        headers: VERSION_HEADERS,
        body: { ids: [WORKFLOW_ID] },
        responseType: 'json',
      });
      if (conversationId) {
        await asAdmin.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: VERSION_HEADERS, responseType: 'json' }
        );
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    apiTest('runs on top of the conversation without modifying it', async ({ asAdmin }) => {
      apiTest.setTimeout(180_000);

      await setupAgentDirectAnswer({ proxy: llmProxy, title: 'Source', response: 'First answer' });
      const converse = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
        headers: VERSION_HEADERS,
        body: {
          input: 'Hello',
          connector_id: connectorId,
          // The workflow step does not run as the owner's user profile, so it cannot see a private conversation.
          access_control: { access_mode: ConversationAccessControlMode.Public },
        },
        responseType: 'json',
      });
      expect(converse, JSON.stringify(converse.body)).toHaveStatusCode(200);
      const storedConversationId = (converse.body as { conversation_id: string }).conversation_id;
      conversationId = storedConversationId;
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const readConversation = async () => {
        const res = await asAdmin.get(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(storedConversationId)}`,
          { headers: VERSION_HEADERS, responseType: 'json' }
        );
        expect(res).toHaveStatusCode(200);
        return res.body as Conversation;
      };
      const before = await readConversation();

      const created = await asAdmin.post('api/workflows/workflow', {
        headers: VERSION_HEADERS,
        body: {
          id: WORKFLOW_ID,
          yaml: workflowYaml({ connectorId, conversationId: storedConversationId }),
        },
        responseType: 'json',
      });
      expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);

      const requestsBeforeRun = llmProxy.interceptedRequests.length;
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        continueConversation: true,
        response: 'A summary',
      });
      const run = await asAdmin.post(`api/workflows/workflow/${WORKFLOW_ID}/run`, {
        headers: VERSION_HEADERS,
        body: { inputs: {} },
        responseType: 'json',
      });
      expect(run, JSON.stringify(run.body)).toHaveStatusCode(200);
      const { workflowExecutionId } = run.body as { workflowExecutionId: string };

      let execution: WorkflowExecution = {};
      await expect
        .poll(
          async () => {
            execution = (
              await asAdmin.get(
                `api/workflows/executions/${workflowExecutionId}?includeOutput=true`,
                {
                  headers: VERSION_HEADERS,
                  responseType: 'json',
                }
              )
            ).body;
            return (
              execution.status !== undefined && TerminalExecutionStatuses.includes(execution.status)
            );
          },
          { timeout: 120_000 }
        )
        .toBe(true);
      expect(execution.status, JSON.stringify(execution)).toBe(ExecutionStatus.COMPLETED);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const [answerRequest] = llmProxy.interceptedRequests
        .slice(requestsBeforeRun)
        .filter((request) => request.matchingInterceptorName === 'final-assistant-response');
      const prompt = JSON.stringify(answerRequest?.requestBody.messages);
      expect(prompt).toContain('Hello');
      expect(prompt).toContain('First answer');
      expect(prompt).toContain('Summarize this conversation.');

      const stepOutput = execution.stepExecutions?.find(
        ({ stepId }) => stepId === 'summarize'
      )?.output;
      expect(stepOutput?.message).toBe('A summary');
      expect(stepOutput?.conversation_id).toBeUndefined();

      const after = await readConversation();
      expect(after.updated_at).toBe(before.updated_at);
      expect(after.rounds).toHaveLength(before.rounds.length);
      expect(after.title).toBe(before.title);
    });
  }
);
