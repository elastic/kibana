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
  makeHitlTwoStepWorkflowYaml,
  toLangchainToolName,
  extractFormPrompt,
  pollUntil,
  waitForExecutionTerminal,
} from '../fixtures/converse_hitl_helpers';

apiTest.describe('Agent Builder — HITL nested path', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let llmProxy: LlmProxy;
  let connectorId: string;

  let innerWorkflowId: string;
  let innerWorkflowToolId: string;
  let hitlAgentId: string;

  /**
   * Outer workflow for the nested HITL path. It contains an `ai.agent` step
   * that runs hitlAgentId, which in turn calls innerWorkflowToolId.
   * Populated lazily inside the nested test so it can embed the connectorId.
   */
  let outerWorkflowId: string | undefined;
  /** Tool wrapping outerWorkflowId, for the nested outer agent. */
  let outerWorkflowToolId: string | undefined;
  /** Agent whose only tool is outerWorkflowToolId. */
  let nestedOuterAgentId: string | undefined;

  /** Two-step waitForInput workflow for the workflow_advanced_to_new_prompt test. */
  let twoStepWorkflowId: string | undefined;
  /** Tool wrapping twoStepWorkflowId. */
  let twoStepWorkflowToolId: string | undefined;
  /** Agent whose only tool is twoStepWorkflowToolId. */
  let twoStepAgentId: string | undefined;

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

  /**
   * Creates the outer workflow + tool + agent for the nested path.
   * Deferred until we have connectorId and hitlAgentId from beforeAll.
   */
  const ensureNestedResources = async (asAdmin: {
    post: (
      url: string,
      opts?: Record<string, unknown>
    ) => Promise<{ statusCode: number; body: unknown }>;
  }) => {
    if (outerWorkflowId) return; // already set up

    const uniqueSuffix = `nested-${Date.now()}`;

    // Outer workflow: single ai.agent step calling the inner HITL agent
    const outerWorkflowYaml = `
name: hitl-outer-${uniqueSuffix}
enabled: true
triggers:
  - type: manual
steps:
  - name: run_inner_agent
    type: ai.agent
    agent-id: "${hitlAgentId}"
    connector-id: "${connectorId}"
    with:
      message: "Please trigger the HITL workflow"
`.trim();

    const outerWfRes = await asAdmin.post('/api/workflows/workflow', {
      headers: WORKFLOWS_API_HEADERS,
      body: { yaml: outerWorkflowYaml },
      responseType: 'json',
    });
    expect(outerWfRes.statusCode).toBe(200);
    outerWorkflowId = (outerWfRes.body as { id: string }).id;
    workflowIds.push(outerWorkflowId);

    // Outer workflow tool
    outerWorkflowToolId = `hitl-outer-tool-${uniqueSuffix}`;
    const outerToolRes = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
      body: {
        id: outerWorkflowToolId,
        name: 'HITL Outer Workflow',
        type: 'workflow',
        description: 'Triggers the nested HITL outer workflow',
        configuration: {
          workflow_id: outerWorkflowId,
          wait_for_completion: true,
        },
      },
      responseType: 'json',
    });
    expect(outerToolRes.statusCode).toBe(200);
    toolIds.push(outerWorkflowToolId);

    // Nested outer agent (only has the outer workflow tool)
    nestedOuterAgentId = `hitl-nested-outer-agent-${uniqueSuffix}`;
    const nestedAgentRes = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
      body: {
        id: nestedOuterAgentId,
        name: 'Nested HITL Outer Agent',
        description: 'Agent for nested HITL integration testing',
        configuration: {
          instructions:
            'When asked to trigger the nested HITL workflow, use the outer workflow tool.',
          tools: [{ tool_ids: [outerWorkflowToolId] }],
        },
      },
      responseType: 'json',
    });
    expect(nestedAgentRes.statusCode).toBe(200);
    agentIds.push(nestedOuterAgentId!);
  };

  /**
   * Creates the two-step workflow + tool + agent for the workflow_advanced_to_new_prompt
   * test. Deferred until we have connectorId from beforeAll.
   */
  const ensureTwoStepResources = async (asAdmin: {
    post: (
      url: string,
      opts?: Record<string, unknown>
    ) => Promise<{ statusCode: number; body: unknown }>;
  }) => {
    if (twoStepWorkflowId) return;

    const uniqueSuffix = `two-step-${Date.now()}`;

    const twoStepWfRes = await asAdmin.post('/api/workflows/workflow', {
      headers: WORKFLOWS_API_HEADERS,
      body: { yaml: makeHitlTwoStepWorkflowYaml(`hitl-two-step-${uniqueSuffix}`) },
      responseType: 'json',
    });
    expect(twoStepWfRes.statusCode).toBe(200);
    twoStepWorkflowId = (twoStepWfRes.body as { id: string }).id;
    workflowIds.push(twoStepWorkflowId);

    twoStepWorkflowToolId = `hitl-two-step-tool-${uniqueSuffix}`;
    const twoStepToolRes = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
      body: {
        id: twoStepWorkflowToolId,
        name: 'HITL Two-Step Workflow',
        type: 'workflow',
        description: 'Triggers the two-step HITL waitForInput workflow',
        configuration: {
          workflow_id: twoStepWorkflowId,
          wait_for_completion: true,
        },
      },
      responseType: 'json',
    });
    expect(twoStepToolRes.statusCode).toBe(200);
    toolIds.push(twoStepWorkflowToolId);

    twoStepAgentId = `hitl-two-step-agent-${uniqueSuffix}`;
    const twoStepAgentRes = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
      body: {
        id: twoStepAgentId,
        name: 'HITL Two-Step Test Agent',
        description: 'Agent for two-step HITL integration testing',
        configuration: {
          instructions:
            'When asked to trigger the two-step HITL workflow, use the available workflow tool.',
          tools: [{ tool_ids: [twoStepWorkflowToolId] }],
        },
      },
      responseType: 'json',
    });
    expect(twoStepAgentRes.statusCode).toBe(200);
    agentIds.push(twoStepAgentId!);
  };

  apiTest(
    '[S4] outer workflow propagates WAITING_FOR_INPUT; inbox shows row for nested waitForInput',
    async ({ apiClient, asAdmin }) => {
      await ensureNestedResources(asAdmin);

      const outerToolLangchainName = toLangchainToolName(outerWorkflowToolId!);
      const innerToolLangchainName = toLangchainToolName(innerWorkflowToolId);

      // Round 1 needs three mocks (sequential LLM calls):
      //   1. Title generation (nested outer agent)
      //   2. Nested outer agent's research call → calls outer workflow tool
      //   3. Sub-agent (inside ai.agent step) research call → calls inner workflow tool
      // Both agents hit HITL and return awaitingPrompt, so no handover/answer mocks needed.
      mockTitleGeneration(llmProxy, 'Nested HITL Test');
      mockAgentToolCall({
        name: 'outer-agent:calls-outer-workflow-tool',
        llmProxy,
        toolName: outerToolLangchainName,
        toolArg: {},
      });
      mockAgentToolCall({
        name: 'sub-agent:calls-inner-workflow-tool',
        llmProxy,
        toolName: innerToolLangchainName,
        toolArg: {},
      });

      const res = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: nestedOuterAgentId,
          connector_id: connectorId,
          input: 'Please trigger the nested HITL workflow',
        },
        'local'
      );
      expect(res).toHaveStatusCode(200);

      const body = res.body as ChatResponse;
      conversationIds.push(body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // The outer agent must be in awaitingPrompt state
      const outerFormPrompt = extractFormPrompt(body);
      expect(outerFormPrompt.type).toBe(AgentPromptType.form);
      expect(outerFormPrompt.execution_id).toBeDefined();

      // The outer form prompt must carry the inner waitForInput schema (non-empty).
      // This assertion catches the B1 regression: the schema was previously dropped
      // when the nested ai.agent step propagated the WAITING_FOR_INPUT status.
      expect(outerFormPrompt.schema).toBeDefined();
      expect(outerFormPrompt.schema).not.toStrictEqual({});
      const schemaProperties = (
        outerFormPrompt.schema as { properties?: { approved?: { type?: string } } }
      ).properties;
      expect(schemaProperties?.approved).toBeDefined();
      expect(schemaProperties?.approved?.type).toBe('boolean');

      // The message from the inner waitForInput step must also be propagated.
      expect(outerFormPrompt.message).toBe('Please approve this action');

      // The outer workflow execution must be in WAITING_FOR_INPUT
      const outerExecRes = await asAdmin.get(
        `/api/workflows/executions/${encodeURIComponent(outerFormPrompt.execution_id)}`,
        { headers: WORKFLOWS_API_HEADERS, responseType: 'json' }
      );
      expect(outerExecRes.statusCode).toBe(200);
      expect((outerExecRes.body as { status: string }).status).toBe('waiting_for_input');

      // Inbox must show a row for the nested waitForInput step
      const inboxRes = await asAdmin.get('/internal/inbox/actions', {
        headers: INBOX_API_HEADERS,
        responseType: 'json',
      });
      expect(inboxRes.statusCode).toBe(200);
      const { actions } = inboxRes.body as {
        actions: Array<{ source_app: string; source_id: string }>;
      };
      const nestedInboxAction = actions.find(
        (a) => a.source_app === 'workflows' && a.source_id.includes(outerFormPrompt.execution_id)
      );
      expect(nestedInboxAction).toBeDefined();

      // ── submit via chat form ─────────────────────────────────────────
      // After form submission the outer workflow resumes (calls ai.agent again,
      // which resumes the inner execution and re-runs the sub-agent).  The
      // sub-agent's LLM calls happen asynchronously; we add extra mocks for
      // them but don't block on their completion here — we poll status instead.
      mockHandoverToAnswer(llmProxy, 'Outer agent handover');
      mockFinalAnswer(llmProxy, 'Nested workflow completed.');
      // Extra mocks for the background sub-agent resumed round
      mockHandoverToAnswer(llmProxy, 'Sub-agent handover');
      mockFinalAnswer(llmProxy, 'Sub-agent answer.');

      const submitRes = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: nestedOuterAgentId,
          connector_id: connectorId,
          conversation_id: body.conversation_id,
          form_prompts: [
            {
              id: outerFormPrompt.id,
              execution_id: outerFormPrompt.execution_id,
              values: { approved: true },
            },
          ],
        },
        'local'
      );
      expect(submitRes).toHaveStatusCode(200);

      // Poll until the outer workflow reaches a terminal state
      const outerTerminal = await waitForExecutionTerminal(asAdmin, outerFormPrompt.execution_id);
      expect((outerTerminal.body as { status: string }).status).toBe('completed');
    }
  );

  apiTest(
    '[S6/R3] workflow_advanced_to_new_prompt: User B advances step-1; User A stale submission surfaces step-2 form and audit step',
    async ({ apiClient, asAdmin }) => {
      await ensureTwoStepResources(asAdmin);

      const twoStepToolLangchainName = toLangchainToolName(twoStepWorkflowToolId!);

      // ── round 1: trigger two-step workflow → awaitingPrompt at step 1 ──
      mockTitleGeneration(llmProxy, 'HITL Advanced-Prompt Test');
      mockAgentToolCall({
        name: 'two-step-agent:calls-two-step-workflow-tool',
        llmProxy,
        toolName: twoStepToolLangchainName,
        toolArg: {},
      });

      const res = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: twoStepAgentId,
          connector_id: connectorId,
          input: 'Please trigger the two-step HITL workflow',
        },
        'local'
      );
      expect(res).toHaveStatusCode(200);

      const body = res.body as ChatResponse;
      conversationIds.push(body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const step1FormPrompt = extractFormPrompt(body);
      expect(step1FormPrompt.execution_id).toBeDefined();
      expect(step1FormPrompt.step_execution_id).toBeDefined();

      // ── User B: respond to step 1 via Inbox API (advances workflow to step 2) ─
      const inboxRes = await asAdmin.get('/internal/inbox/actions', {
        headers: INBOX_API_HEADERS,
        responseType: 'json',
      });
      expect(inboxRes.statusCode).toBe(200);

      const { actions } = inboxRes.body as {
        actions: Array<{ source_app: string; source_id: string }>;
      };
      const step1Action = actions.find(
        (a) =>
          a.source_app === 'workflows' &&
          a.source_id.includes(step1FormPrompt.execution_id) &&
          a.source_id.includes(step1FormPrompt.step_execution_id)
      );
      expect(step1Action).toBeDefined();

      const step1RespondRes = await asAdmin.post(
        `/internal/inbox/actions/workflows/${encodeURIComponent(step1Action!.source_id)}/respond`,
        {
          headers: INBOX_API_HEADERS,
          body: { input: { approved: true } },
          responseType: 'json',
        }
      );
      expect(step1RespondRes.statusCode).toBe(200);

      // Poll until the execution advances to step 2 (different step_execution_id).
      await pollUntil(
        () =>
          asAdmin.get(
            `/api/workflows/executions/${encodeURIComponent(step1FormPrompt.execution_id)}`,
            { headers: WORKFLOWS_API_HEADERS, responseType: 'json' }
          ),
        (execRes) => {
          const execBody = execRes.body as {
            status?: string;
            waiting_input?: { step_execution_id?: string };
          };
          return (
            execBody.status === 'waiting_for_input' &&
            execBody.waiting_input?.step_execution_id !== undefined &&
            execBody.waiting_input.step_execution_id !== step1FormPrompt.step_execution_id
          );
        },
        { label: 'execution to advance to step 2' }
      );

      // ── User A: submit stale step-1 form (workflow_advanced_to_new_prompt) ──
      // The conversation is still awaitingPrompt at step 1 from User A's perspective.
      // resumeFormPrompts will classify this as workflow_advanced_to_new_prompt,
      // add a stale audit step, and append the step-2 form prompt to pending_prompts.
      mockHandoverToAnswer(llmProxy, 'The workflow has advanced to a new prompt.');
      mockFinalAnswer(
        llmProxy,
        'Your submission arrived late; the workflow has advanced to step 2.'
      );

      const staleRes = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        {
          agent_id: twoStepAgentId,
          connector_id: connectorId,
          conversation_id: body.conversation_id,
          form_prompts: [
            {
              id: step1FormPrompt.id,
              execution_id: step1FormPrompt.execution_id,
              values: { approved: true },
            },
          ],
        },
        'local'
      );
      expect(staleRes).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // ── verify stale audit step and step-2 form prompt ────────────
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
      expect((staleAuditStep as unknown as { reason: string }).reason).toBe('workflow_advanced');
      expect(
        (staleAuditStep as unknown as { submitted_values: unknown }).submitted_values
      ).toStrictEqual({ approved: true });

      // The step-2 form prompt must have been appended to the round's pending_prompts.
      const step2FormPrompt = awaitingRound!.pending_prompts?.find(
        (p) => p.type === AgentPromptType.form && p.id !== step1FormPrompt.id
      );
      expect(step2FormPrompt).toBeDefined();
      expect(step2FormPrompt!.type).toBe(AgentPromptType.form);
    }
  );
});
