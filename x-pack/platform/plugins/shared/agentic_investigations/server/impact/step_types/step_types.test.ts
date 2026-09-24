/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { attachImpactStepInputSchema } from '../../../common/impact/step_types/attach_impact_step';
import type { ImpactService } from '../services/impact_service';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import { ImpactConflictError, ImpactForbiddenError, ImpactNotFoundError } from '../services/errors';
import { getAttachImpactStepDefinition } from './attach_impact_step';
import { getGetImpactStepDefinition } from './get_impact_step';

const SPACE_ID = 'space-a';
const FAKE_REQUEST = { fake: true } as never;

const resolvedUser = {
  username: 'worker-user',
  fullName: 'Worker User',
  email: null,
  profileUid: 'worker-uid',
};
const resolveUser = jest.fn().mockResolvedValue(resolvedUser);

const allowAll = (): jest.Mocked<ImpactPrivilegesChecker> => ({
  assertCanManage: jest.fn().mockResolvedValue(undefined),
  assertCanRead: jest.fn().mockResolvedValue(undefined),
});

const createContext = (input: Record<string, unknown>): StepHandlerContext<never, never> =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: 'exec-1', executedBy: 'worker-user' },
        workflow: { spaceId: SPACE_ID },
      }),
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'attach_impact',
    stepType: 'investigations.attachImpact',
  } as unknown as StepHandlerContext<never, never>);

describe('investigations.attachImpact input schema', () => {
  it('should require at least one entity', () => {
    expect(
      attachImpactStepInputSchema.safeParse({ conversationId: 'conv-1', entities: [] }).success
    ).toBe(false);
  });

  it('should still convert to a JSON schema the YAML editor can use', () => {
    const jsonSchema = z.toJSONSchema(attachImpactStepInputSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'ref',
    }) as { properties: Record<string, unknown>; required?: string[] };

    expect(Object.keys(jsonSchema.properties)).toEqual(
      Object.keys(attachImpactStepInputSchema.shape)
    );
    expect(jsonSchema.required).toEqual(['conversationId', 'entities']);
  });
});

describe('investigations.attachImpact step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDefinition = (
    attach: jest.Mock,
    privileges = allowAll(),
    getAttachmentClient: () => Promise<{ create: jest.Mock } | undefined> = async () => ({
      create: jest.fn().mockResolvedValue({ id: 'impact-1' }),
    })
  ) => ({
    definition: getAttachImpactStepDefinition({
      getImpactService: () => ({ attach } as unknown as ImpactService),
      resolveUser,
      privileges,
      getAttachmentClient: getAttachmentClient as never,
    }),
    privileges,
  });

  it('should attach through the service with the space and the resolved user', async () => {
    const entities = [{ id: 'user-1' }, { id: 'host-1', name: 'fin-dc-01' }];
    const attach = jest.fn().mockResolvedValue({
      id: 'impact-1',
      conversationId: 'conv-1',
      entities,
    });
    const { definition } = createDefinition(attach);

    const result = await definition.handler(createContext({ conversationId: 'conv-1', entities }));

    expect(attach).toHaveBeenCalledWith(
      { conversationId: 'conv-1', entities },
      { spaceId: SPACE_ID, user: resolvedUser }
    );
    expect(resolveUser).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(result.output).toEqual({
      id: 'impact-1',
      entities,
    });
  });

  it('should assert manage before writing anything', async () => {
    const attach = jest.fn();
    const privileges = allowAll();
    privileges.assertCanManage.mockRejectedValue(new ImpactForbiddenError('nope'));
    const { definition } = createDefinition(attach, privileges);

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1', entities: [{ id: 'user-1' }] }))
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(attach).not.toHaveBeenCalled();
  });

  it('should fail the step with a typed error when the service fails', async () => {
    const attach = jest.fn().mockRejectedValue(new Error('index unavailable'));
    const { definition } = createDefinition(attach);

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1', entities: [{ id: 'user-1' }] }))
    ).rejects.toMatchObject({ type: 'ApiError', message: 'index unavailable' });
  });

  it('should fail the step with ConflictError when concurrent attaches exhaust retries', async () => {
    const attach = jest.fn().mockRejectedValue(new ImpactConflictError('conv-1'));
    const { definition } = createDefinition(attach);

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1', entities: [{ id: 'user-1' }] }))
    ).rejects.toMatchObject({ type: 'ConflictError' });
  });

  it('should reject a malformed input as a ValidationError rather than calling the service', async () => {
    const attach = jest.fn();
    const { definition } = createDefinition(attach);

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({ type: 'ValidationError' });
    expect(attach).not.toHaveBeenCalled();
  });

  it('should stamp a by-reference attachment onto the conversation after writing', async () => {
    const attach = jest.fn().mockResolvedValue({
      id: 'impact-1',
      conversationId: 'conv-1',
      entities: [{ id: 'user-1' }],
    });
    const create = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const { definition } = createDefinition(attach, allowAll(), async () => ({ create }));

    await definition.handler(
      createContext({ conversationId: 'conv-1', entities: [{ id: 'user-1' }] })
    );

    expect(create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'impact-1',
      type: 'investigation_impact',
      origin: 'impact-1',
    });
  });
});

describe('investigations.getImpact step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getDefinition = (getByConversationId: jest.Mock, privileges = allowAll()) =>
    getGetImpactStepDefinition({
      getImpactService: () => ({ getByConversationId } as unknown as ImpactService),
      privileges,
    });

  it('should return the fields a workflow can branch on', async () => {
    const entities = [{ id: 'host-1', name: 'fin-dc-01' }];
    const getByConversationId = jest.fn().mockResolvedValue({
      id: 'impact-1',
      conversationId: 'conv-1',
      entities,
      createdAt: 'not part of the contract',
    });

    const result = await getDefinition(getByConversationId).handler(
      createContext({ conversationId: 'conv-1' })
    );

    expect(getByConversationId).toHaveBeenCalledWith('conv-1', SPACE_ID);
    expect(result.output).toEqual({
      id: 'impact-1',
      entities,
    });
  });

  it('should assert read rather than manage', async () => {
    const getByConversationId = jest.fn().mockResolvedValue({
      id: 'impact-1',
      entities: [{ id: 'host-1' }],
    });
    const privileges = allowAll();

    await getDefinition(getByConversationId, privileges).handler(
      createContext({ conversationId: 'conv-1' })
    );

    expect(privileges.assertCanRead).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(privileges.assertCanManage).not.toHaveBeenCalled();
  });

  it('should fail the step when the reader lacks the privilege', async () => {
    const getByConversationId = jest.fn();
    const privileges = allowAll();
    privileges.assertCanRead.mockRejectedValue(new ImpactForbiddenError('nope'));

    await expect(
      getDefinition(getByConversationId, privileges).handler(
        createContext({ conversationId: 'conv-1' })
      )
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(getByConversationId).not.toHaveBeenCalled();
  });

  it('should fail the step when no impact has been attached yet', async () => {
    const getByConversationId = jest.fn().mockRejectedValue(new ImpactNotFoundError('conv-1'));

    await expect(
      getDefinition(getByConversationId).handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({
      type: 'NotFoundError',
      message: 'Impact for conversation conv-1 was not found',
    });
  });
});
