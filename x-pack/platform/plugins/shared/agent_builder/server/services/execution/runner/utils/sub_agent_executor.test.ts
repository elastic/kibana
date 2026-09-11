/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AutoApprovedApi, InteractivityConfig } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import { createSubAgentExecutor } from './sub_agent_executor';

describe('createSubAgentExecutor', () => {
  const autoApprovedApis: AutoApprovedApi[] = [{ target: 'elasticsearch', api: 'indices.create' }];

  let executeAgent: jest.Mock;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  const createExecutor = (interactivity: InteractivityConfig) => {
    const executionService = { executeAgent } as unknown as AgentExecutionService;
    return createSubAgentExecutor({
      request,
      getExecutionService: () => executionService,
      interactivity,
    });
  };

  beforeEach(() => {
    executeAgent = jest.fn().mockResolvedValue({});
    request = httpServerMock.createKibanaRequest();
  });

  it('inherits the parent pre-approvals without ever enabling interactivity', async () => {
    const executor = createExecutor({ enabled: true, auto_approved_apis: autoApprovedApis });

    await executor.executeSubAgent({
      agentId: 'child',
      prompt: 'go',
      parentExecutionId: 'parent-execution-id',
    });
    await executor.createSubAgent({
      agentId: 'child',
      prompt: 'go',
      parentExecutionId: 'parent-execution-id',
      conversationId: 'conversation-id',
      parentConversationId: 'parent-conversation-id',
      subagentName: 'child',
      subagentPurpose: 'testing',
    });
    await executor.sendToSubAgent({
      conversationId: 'conversation-id',
      prompt: 'go',
      parentExecutionId: 'parent-execution-id',
    });

    expect(executeAgent).toHaveBeenCalledTimes(3);
    for (const [params] of executeAgent.mock.calls) {
      expect(params.interactive).toEqual({ enabled: false, auto_approved_apis: autoApprovedApis });
    }
  });

  it('omits the grant entirely when the parent has none', async () => {
    const executor = createExecutor({ enabled: true });

    await executor.executeSubAgent({
      agentId: 'child',
      prompt: 'go',
      parentExecutionId: 'parent-execution-id',
    });

    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ interactive: { enabled: false } })
    );
  });
});
