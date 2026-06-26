/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  AgentAccessControlMode,
  AgentAccessControlRole,
  AgentBuilderErrorCode,
  AgentType,
  ConversationAccessControlMode,
  createBadRequestError,
  isBadRequestError,
} from '@kbn/agent-builder-common';
import type { InternalAgentDefinition } from '../agents/agent_registry';
import type { AgentsServiceStart } from '../agents';
import { createEmptyConversation } from '../../test_utils';
import { serializeExecutionError, validatePublicConversationCreation } from './execution_runner';

describe('serializeExecutionError', () => {
  it('passes through AgentBuilderError code, message, and meta', () => {
    const err = createBadRequestError('bad input', { foo: 'bar' });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.badRequest,
      message: 'bad input',
      meta: expect.objectContaining({ statusCode: 400, foo: 'bar' }),
    });
  });

  it('preserves the HTTP status from a Boom error in meta.statusCode', () => {
    const err = Boom.forbidden('Unauthorized to get actions');

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'Unauthorized to get actions',
      meta: { statusCode: 403 },
    });
  });

  it('preserves the HTTP status from a plain error carrying statusCode', () => {
    const err = Object.assign(new Error('nope'), { statusCode: 401 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'nope',
      meta: { statusCode: 401 },
    });
  });

  it('omits meta for plain errors with no status', () => {
    expect(serializeExecutionError(new Error('boom'))).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'boom',
    });
  });

  it('ignores out-of-range status codes', () => {
    const err = Object.assign(new Error('weird'), { statusCode: 200 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'weird',
    });
  });
});

describe('validatePublicConversationCreation', () => {
  const owner = { id: 'owner-id', username: 'alice' };
  const request = {} as KibanaRequest;

  const createAgent = (
    accessControl: InternalAgentDefinition['access_control']
  ): InternalAgentDefinition =>
    ({
      id: 'agent-1',
      type: AgentType.chat,
      name: 'Agent',
      description: 'Test agent',
      readonly: false,
      access_control: accessControl,
      created_by: owner,
      configuration: { tools: [] },
      permissions: { update_agent: true, update_access_control: true },
      isAvailable: () => ({ status: 'available' }),
    } as InternalAgentDefinition);

  const createAgentService = (agent: InternalAgentDefinition): AgentsServiceStart => {
    return {
      getRegistry: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue(agent),
      }),
    } as unknown as AgentsServiceStart;
  };

  it('rejects new public conversations for private agents', async () => {
    const agentService = createAgentService(
      createAgent({ access_mode: AgentAccessControlMode.Private, entries: [] })
    );

    await validatePublicConversationCreation({
      agentId: 'agent-1',
      agentService,
      request,
      conversation: {
        ...createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        operation: 'CREATE',
      },
    }).catch((error: unknown) => {
      expect(isBadRequestError(error)).toBe(true);
      expect(error).toHaveProperty(
        'message',
        'Cannot create a public conversation for agent agent-1 because the agent is private.'
      );
    });
    expect.assertions(2);
  });

  it('rejects new public conversations for private agents even with explicit grants', async () => {
    const agentService = createAgentService(
      createAgent({
        access_mode: AgentAccessControlMode.Private,
        entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.User }],
      })
    );

    await expect(
      validatePublicConversationCreation({
        agentId: 'agent-1',
        agentService,
        request,
        conversation: {
          ...createEmptyConversation({
            access_control: { access_mode: ConversationAccessControlMode.Public },
          }),
          operation: 'CREATE',
        },
      })
    ).rejects.toHaveProperty(
      'message',
      'Cannot create a public conversation for agent agent-1 because the agent is private.'
    );
  });

  it('allows new public conversations for public and shared agents', async () => {
    for (const accessMode of [AgentAccessControlMode.Public, AgentAccessControlMode.Shared]) {
      const agentService = createAgentService(
        createAgent({ access_mode: accessMode, entries: [] })
      );

      await expect(
        validatePublicConversationCreation({
          agentId: 'agent-1',
          agentService,
          request,
          conversation: {
            ...createEmptyConversation({
              access_control: { access_mode: ConversationAccessControlMode.Public },
            }),
            operation: 'CREATE',
          },
        })
      ).resolves.toBeUndefined();
    }
  });

  it('allows new public conversations for legacy agents without access control', async () => {
    const agentService = createAgentService(createAgent(undefined));

    await expect(
      validatePublicConversationCreation({
        agentId: 'agent-1',
        agentService,
        request,
        conversation: {
          ...createEmptyConversation({
            access_control: { access_mode: ConversationAccessControlMode.Public },
          }),
          operation: 'CREATE',
        },
      })
    ).resolves.toBeUndefined();
  });

  it('does not validate ignored access control when updating an existing conversation', async () => {
    const agentService = createAgentService(
      createAgent({ access_mode: AgentAccessControlMode.Private, entries: [] })
    );

    await expect(
      validatePublicConversationCreation({
        agentId: 'agent-1',
        agentService,
        request,
        conversation: {
          ...createEmptyConversation({
            access_control: { access_mode: ConversationAccessControlMode.Public },
          }),
          operation: 'UPDATE',
        },
      })
    ).resolves.toBeUndefined();
    expect(agentService.getRegistry).not.toHaveBeenCalled();
  });
});
