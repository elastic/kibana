/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentNotFoundError, createBadRequestError } from '@kbn/agent-builder-common';
import { createConversationStepDefinition } from './create_conversation';
import {
  createStepHandlerContext,
  createWorkflowStepAgentRegistryMock,
  createWorkflowStepConversationClientMock,
} from '../../test_utils/workflow_steps';

const isExperimentalEnabled = jest.fn().mockResolvedValue(true);

describe('createConversationStepDefinition', () => {
  const baseInput = { title: 'New conversation' };

  const createdConversation = {
    id: 'conv-1',
    agent_id: 'elastic-default-agent',
    title: 'New conversation',
    metadata: {},
    rounds: [],
  };

  const buildDefinition = (
    convOverrides: Parameters<typeof createWorkflowStepConversationClientMock>[0] = {},
    agentOverrides: Parameters<typeof createWorkflowStepAgentRegistryMock>[0] = {}
  ) => {
    const conv = createWorkflowStepConversationClientMock(convOverrides);
    const agents = createWorkflowStepAgentRegistryMock(agentOverrides);
    const definition = createConversationStepDefinition({
      getConversationClient: conv.getConversationClient,
      getAgentRegistry: agents.getAgentRegistry,
      isExperimentalEnabled,
    });
    return { conv, agents, definition };
  };

  it('creates expected step definition structure', () => {
    const { definition } = buildDefinition();

    expect(definition.id).toBe('ai.conversation.create');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(baseInput).success).toBe(true);
  });

  it('creates a conversation and returns id, agent, metadata', async () => {
    const { conv, agents, definition } = buildDefinition({
      create: jest.fn().mockResolvedValue(createdConversation),
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { title: 'New conversation', agent_id: 'elastic-default-agent' },
      })
    );

    expect(agents.get).toHaveBeenCalledWith('elastic-default-agent', { access: 'use' });
    expect(conv.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'elastic-default-agent',
        title: 'New conversation',
      })
    );
    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        agent_id: 'elastic-default-agent',
        metadata: {},
      },
    });
  });

  it('forwards template_id and metadata and returns them', async () => {
    const templated = {
      ...createdConversation,
      template_id: 'incident-response',
      metadata: { severity: 'high', services: ['checkout'] },
    };
    const { conv, definition } = buildDefinition({
      create: jest.fn().mockResolvedValue(templated),
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: {
          template_id: 'incident-response',
          metadata: { severity: 'high', services: ['checkout'] },
        },
      })
    );

    expect(conv.create).toHaveBeenCalledWith(
      expect.objectContaining({
        template_id: 'incident-response',
        metadata: { severity: 'high', services: ['checkout'] },
      })
    );
    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        agent_id: 'elastic-default-agent',
        template_id: 'incident-response',
        metadata: { severity: 'high', services: ['checkout'] },
      },
    });
  });

  it('returns an error when the agent cannot be resolved', async () => {
    const { definition } = buildDefinition(
      {},
      { get: jest.fn().mockRejectedValue(createAgentNotFoundError({ agentId: 'nope' })) }
    );

    const result = await definition.handler(
      createStepHandlerContext({ input: { agent_id: 'nope' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('nope') }),
    });
  });

  it('returns an error when the conversation id already exists', async () => {
    const create = jest.fn();
    const { definition } = buildDefinition({
      exists: jest.fn().mockResolvedValue(true),
      create,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: '550e8400-e29b-41d4-a716-446655440000' },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringMatching(/already exists/i),
      }),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('propagates template validation errors from the underlying client', async () => {
    const { definition } = buildDefinition({
      create: jest.fn().mockRejectedValue(createBadRequestError('Template not found: missing')),
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { template_id: 'missing' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('Template not found') }),
    });
  });

  describe('input schema', () => {
    const schema = createConversationStepDefinition({
      getConversationClient: jest.fn(),
      getAgentRegistry: jest.fn(),
      isExperimentalEnabled,
    }).inputSchema;

    it('accepts an empty body', () => {
      expect(schema.safeParse({}).success).toBe(true);
    });

    it('accepts template_id + metadata', () => {
      expect(
        schema.safeParse({
          template_id: 'incident-response',
          metadata: { severity: 'high', services: ['checkout'], on_call: true, count: 3 },
        }).success
      ).toBe(true);
    });

    it('rejects metadata without template_id', () => {
      const parsed = schema.safeParse({ metadata: { severity: 'high' } });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toMatch(/`metadata` requires `template_id`/);
      }
    });

    it('rejects a non-UUID conversation_id', () => {
      expect(schema.safeParse({ conversation_id: 'not-a-uuid' }).success).toBe(false);
    });

    it('rejects ACL entries on a public access mode', () => {
      const parsed = schema.safeParse({
        access_control: {
          access_mode: 'public',
          entries: [{ type: 'user', id: 'u1', role: 'member' }],
        },
      });
      expect(parsed.success).toBe(false);
    });
  });
});
