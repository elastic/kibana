/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ConversationClient } from '../services/conversation';
import type { AgentRegistry } from '../services/agents';

interface CreateStepHandlerContextParams {
  input?: unknown;
  config?: Record<string, unknown>;
  stepType?: string;
  overrides?: Partial<StepHandlerContext>;
}

export const createStepHandlerContext = ({
  input = {},
  config = {},
  stepType = 'agentBuilder.conversation.custom',
  overrides = {},
}: CreateStepHandlerContextParams = {}): StepHandlerContext => {
  const context = {
    input,
    rawInput: input,
    config,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step-id',
    stepType,
  } as unknown as StepHandlerContext;

  return {
    ...context,
    ...overrides,
  };
};

export const createWorkflowStepConversationClientMock = (
  overrides: Partial<{
    get: jest.Mock;
    list: jest.Mock;
    patchMetadata: jest.Mock;
    create: jest.Mock;
    exists: jest.Mock;
  }> = {}
) => {
  const get = overrides.get ?? jest.fn();
  const list = overrides.list ?? jest.fn();
  const patchMetadata = overrides.patchMetadata ?? jest.fn();
  const create = overrides.create ?? jest.fn();
  const exists = overrides.exists ?? jest.fn().mockResolvedValue(false);
  const getConversationClient = jest.fn().mockResolvedValue({
    get,
    list,
    patchMetadata,
    create,
    exists,
  } as unknown as ConversationClient);

  return { get, list, patchMetadata, create, exists, getConversationClient };
};

export const createWorkflowStepAgentRegistryMock = (
  overrides: Partial<{ get: jest.Mock }> = {}
) => {
  const get = overrides.get ?? jest.fn().mockResolvedValue({ id: 'elastic-default-agent' });
  const getAgentRegistry = jest.fn().mockResolvedValue({
    get,
  } as unknown as AgentRegistry);

  return { get, getAgentRegistry };
};
