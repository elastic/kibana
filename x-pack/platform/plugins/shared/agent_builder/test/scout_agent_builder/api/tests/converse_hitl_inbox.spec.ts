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
import type { ChatResponse } from '../../../../common/http_api/chat';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  mockTitleGeneration,
  mockAgentToolCall,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario/calls';
import { postConverse } from '../fixtures/converse_http';
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

apiTest.describe('Agent Builder — HITL inbox path', { tag: tags.stateful.classic }, () => {
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
    '[S3] inbox path: respond via Inbox API resumes the workflow and reaches completed status',
    async ({ apiClient, asAdmin }) => {
      const langchainToolName = toLangchainToolName(innerWorkflowToolId);

      mockTitleGeneration(llmProxy, 'HITL Inbox Test');
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
          input: 'Please trigger the HITL workflow for inbox test',
        },
        'local'
      );
      expect(res).toHaveStatusCode(200);

      const body = res.body as ChatResponse;
      conversationIds.push(body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const formPrompt = extractFormPrompt(body);
      const { execution_id: executionId, step_execution_id: stepExecutionId } = formPrompt;

      // ── verify inbox shows the waiting action ────────────────────────
      const inboxRes = await asAdmin.get('/internal/inbox/actions', {
        headers: INBOX_API_HEADERS,
        responseType: 'json',
      });
      expect(inboxRes.statusCode).toBe(200);

      const { actions } = inboxRes.body as {
        actions: Array<{ source_app: string; source_id: string }>;
      };
      const workflowActions = actions.filter((a) => a.source_app === 'workflows');

      const ourAction = workflowActions.find(
        (a) => a.source_id.includes(executionId) && a.source_id.includes(stepExecutionId)
      );
      expect(ourAction).toBeDefined();

      // ── respond via Inbox API ────────────────────────────────────────
      const respondRes = await asAdmin.post(
        `/internal/inbox/actions/workflows/${encodeURIComponent(ourAction!.source_id)}/respond`,
        {
          headers: INBOX_API_HEADERS,
          body: { input: { approved: true } },
          responseType: 'json',
        }
      );
      expect(respondRes.statusCode).toBe(200);

      // ── poll until execution reaches terminal state ───────────────────
      const terminalExecution = await waitForExecutionTerminal(asAdmin, executionId);
      expect((terminalExecution.body as { status: string }).status).toBe('completed');
    }
  );
});
