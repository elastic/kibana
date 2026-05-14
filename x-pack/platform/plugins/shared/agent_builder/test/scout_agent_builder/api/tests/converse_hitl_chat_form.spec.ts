/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  isOtherStep,
  type OtherStep,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { ChatResponse } from '../../../../common/http_api/chat';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  mockTitleGeneration,
  mockAgentToolCall,
  mockHandoverToAnswer,
  mockFinalAnswer,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario/calls';
import { getConversation, postConverse } from '../fixtures/converse_http';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import {
  WORKFLOWS_API_HEADERS,
  INBOX_API_HEADERS,
  makeHitlWorkflowYaml,
  toLangchainToolName,
  extractFormPrompt,
  waitForExecutionTerminal,
} from '../fixtures/converse_hitl_helpers';

apiTest.describe('Agent Builder — HITL chat-form path', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let llmProxy: LlmProxy;
  let connectorId: string;

  let innerWorkflowId: string;
  let innerWorkflowToolId: string;
  let hitlAgentId: string;

  const conversationIds: string[] = [];
  const workflowIds: string[] = [];
  const toolIds: string[] = [];
  const agentIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth, log, kbnClient, asAdmin }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    llmProxy = await createLlmProxy(log);
    ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

    const uniqueSuffix = Date.now();
    const innerWorkflowName = `hitl-inner-test-${uniqueSuffix}`;
    const innerWfRes = await asAdmin.post('/api/workflows/workflow', {
      headers: WORKFLOWS_API_HEADERS,
      body: { yaml: makeHitlWorkflowYaml(innerWorkflowName) },
      responseType: 'json',
    });
    expect(innerWfRes.statusCode).toBe(200);
    innerWorkflowId = (innerWfRes.body as { id: string }).id;
    workflowIds.push(innerWorkflowId);

    innerWorkflowToolId = `hitl-inner-tool-${uniqueSuffix}`;
    const innerToolRes = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
      body: {
        id: innerWorkflowToolId,
        name: 'HITL Inner Workflow',
        type: 'workflow',
        description: 'Triggers the inner HITL waitForInput workflow',
        configuration: {
          workflow_id: innerWorkflowId,
          wait_for_completion: true,
        },
      },
      responseType: 'json',
    });
    expect(innerToolRes.statusCode).toBe(200);
    toolIds.push(innerWorkflowToolId);

    hitlAgentId = `hitl-agent-${uniqueSuffix}`;
    const agentRes = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
      body: {
        id: hitlAgentId,
        name: 'HITL Test Agent',
        description: 'Agent for HITL integration testing',
        configuration: {
          instructions: 'When asked to trigger the HITL workflow, use the available workflow tool.',
          tools: [{ tool_ids: [innerWorkflowToolId] }],
        },
      },
      responseType: 'json',
    });
    expect(agentRes.statusCode).toBe(200);
    agentIds.push(hitlAgentId);
  });

  apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
    for (const id of conversationIds) {
      await asAdmin
        .delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`)
        .catch(() => undefined);
    }
    for (const id of agentIds) {
      await asAdmin
        .delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(id)}`)
        .catch(() => undefined);
    }
    for (const id of toolIds) {
      await asAdmin
        .delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(id)}`)
        .catch(() => undefined);
    }
    for (const id of workflowIds) {
      await asAdmin
        .delete(`/api/workflows/workflow/${encodeURIComponent(id)}`, {
          headers: WORKFLOWS_API_HEADERS,
        })
        .catch(() => undefined);
    }
    llmProxy.close();
    await deleteConnectorById(kbnClient, connectorId);
  });

  apiTest(
    '[S1] chat-form path: converse returns awaitingPrompt → submit form_prompts → completed + audit step',
    async ({ apiClient, asAdmin }) => {
      const langchainToolName = toLangchainToolName(innerWorkflowToolId);

      mockTitleGeneration(llmProxy, 'HITL Test Conversation');
      mockAgentToolCall({
        llmProxy,
        toolName: langchainToolName,
        toolArg: {},
      });

      const res = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: hitlAgentId,
          connector_id: connectorId,
          input: 'Please trigger the HITL workflow',
        },
        'local'
      );
      expect(res).toHaveStatusCode(200);

      const body = res.body as ChatResponse;
      conversationIds.push(body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const formPrompt = extractFormPrompt(body);
      expect(formPrompt.type).toBe(AgentPromptType.form);
      expect(formPrompt.execution_id).toBeDefined();
      expect(formPrompt.step_execution_id).toBeDefined();
      expect(typeof formPrompt.schema).toBe('object');

      const conversation = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        body.conversation_id
      );
      const lastRound = conversation.rounds[conversation.rounds.length - 1];
      expect(lastRound.status).toBe(ConversationRoundStatus.awaitingPrompt);
      expect(lastRound.pending_prompts?.some((p) => p.type === AgentPromptType.form)).toBe(true);

      // ── round 2: submit form values ──────────────────────────────────
      mockHandoverToAnswer(llmProxy, 'Workflow has been approved');
      mockFinalAnswer(llmProxy, 'The workflow was approved and completed successfully.');

      const submitRes = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: hitlAgentId,
          connector_id: connectorId,
          conversation_id: body.conversation_id,
          form_prompts: [
            {
              id: formPrompt.id,
              execution_id: formPrompt.execution_id,
              values: { approved: true },
            },
          ],
        },
        'local'
      );
      expect(submitRes).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const submitBody = submitRes.body as ChatResponse;
      const resumedPrompts = submitBody.response.prompts ?? [];
      expect(resumedPrompts.filter((p) => p.type === AgentPromptType.form)).toHaveLength(0);

      const executionStatus = await waitForExecutionTerminal(asAdmin, formPrompt.execution_id);
      expect((executionStatus.body as { status: string }).status).toBe('completed');

      // ── verify audit step ────────────────────────────────────────────
      const updatedConversation = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        body.conversation_id
      );

      const awaitingRound = updatedConversation.rounds.find(
        (r) =>
          r.status === ConversationRoundStatus.awaitingPrompt && r.steps.some((s) => isOtherStep(s))
      );
      expect(awaitingRound).toBeDefined();

      const auditStep = awaitingRound!.steps.find(isOtherStep) as OtherStep | undefined;
      expect(auditStep).toBeDefined();
      expect(auditStep!.type).toBe(ConversationRoundStepType.other);
      expect((auditStep as unknown as { kind: string }).kind).toBe('hitl_form_response');
      expect((auditStep as unknown as { values: unknown }).values).toStrictEqual({
        approved: true,
      });
    }
  );

  apiTest(
    '[S5/R3] workflow_already_resolved: User B resolves via inbox; User A stale submission surfaces audit step and LLM follow-up',
    async ({ apiClient, asAdmin }) => {
      const langchainToolName = toLangchainToolName(innerWorkflowToolId);

      // ── round 1: trigger workflow → awaitingPrompt ───────────────
      mockTitleGeneration(llmProxy, 'HITL Already-Resolved Test');
      mockAgentToolCall({ llmProxy, toolName: langchainToolName, toolArg: {} });

      const res = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: hitlAgentId,
          connector_id: connectorId,
          input: 'Please trigger the HITL workflow for stale-already-resolved test',
        },
        'local'
      );
      expect(res).toHaveStatusCode(200);

      const body = res.body as ChatResponse;
      conversationIds.push(body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const formPrompt = extractFormPrompt(body);
      expect(formPrompt.execution_id).toBeDefined();
      expect(formPrompt.step_execution_id).toBeDefined();

      // ── User B: respond via Inbox API (out-of-band) ──────────────
      // This resolves the workflow without going through the agent builder
      // form-prompt endpoint, leaving the conversation in awaitingPrompt state.
      const inboxRes = await asAdmin.get('/internal/inbox/actions', {
        headers: INBOX_API_HEADERS,
        responseType: 'json',
      });
      expect(inboxRes.statusCode).toBe(200);

      const { actions } = inboxRes.body as {
        actions: Array<{ source_app: string; source_id: string }>;
      };
      const ourAction = actions.find(
        (a) =>
          a.source_app === 'workflows' &&
          a.source_id.includes(formPrompt.execution_id) &&
          a.source_id.includes(formPrompt.step_execution_id)
      );
      expect(ourAction).toBeDefined();

      const respondRes = await asAdmin.post(
        `/internal/inbox/actions/workflows/${encodeURIComponent(ourAction!.source_id)}/respond`,
        {
          headers: INBOX_API_HEADERS,
          body: { input: { approved: true } },
          responseType: 'json',
        }
      );
      expect(respondRes.statusCode).toBe(200);

      // Wait for the execution to reach a terminal state before User A submits.
      await waitForExecutionTerminal(asAdmin, formPrompt.execution_id);

      // ── User A: submit stale form (workflow_already_resolved) ─────
      // The conversation is still awaitingPrompt; resumeFormPrompts will
      // classify this submission as stale since the execution is now complete.
      mockHandoverToAnswer(llmProxy, 'The workflow was already resolved before your submission.');
      mockFinalAnswer(
        llmProxy,
        'Your form submission arrived after the workflow had already completed.'
      );

      const staleRes = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: hitlAgentId,
          connector_id: connectorId,
          conversation_id: body.conversation_id,
          form_prompts: [
            {
              id: formPrompt.id,
              execution_id: formPrompt.execution_id,
              values: { approved: true },
            },
          ],
        },
        'local'
      );
      expect(staleRes).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // ── verify stale audit step ───────────────────────────────────
      const updatedConversation = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        body.conversation_id
      );

      const awaitingRound = updatedConversation.rounds.find(
        (r) =>
          r.status === ConversationRoundStatus.awaitingPrompt && r.steps.some((s) => isOtherStep(s))
      );
      expect(awaitingRound).toBeDefined();

      const staleAuditStep = awaitingRound!.steps
        .filter(isOtherStep)
        .find((s) => (s as unknown as { kind: string }).kind === 'hitl_form_response_stale') as
        | OtherStep
        | undefined;
      expect(staleAuditStep).toBeDefined();
      expect(staleAuditStep!.type).toBe(ConversationRoundStepType.other);
      expect((staleAuditStep as unknown as { kind: string }).kind).toBe('hitl_form_response_stale');
      expect((staleAuditStep as unknown as { reason: string }).reason).toBe(
        'workflow_already_resolved'
      );
      expect(
        (staleAuditStep as unknown as { submitted_values: unknown }).submitted_values
      ).toStrictEqual({ approved: true });
    }
  );
});
