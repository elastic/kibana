/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import { tombstoneMemory } from '../core/tombstone_memory';
import { writeMemory } from '../core/write_memory';
import {
  MEMORY_FORGET_STEP_ID,
  MEMORY_RECALL_STEP_ID,
  MEMORY_REMEMBER_STEP_ID,
  registerMemoryWorkflowSteps,
} from '.';

jest.mock('../core/resolve_identity');
jest.mock('../core/recall_memory');
jest.mock('../core/tombstone_memory');
jest.mock('../core/write_memory');

const request = { request: true };
const currentUserEsClient = { currentUser: true };
const storage = { storage: true };
const coreSecurity = { coreSecurity: true };
const identity = { author: 'profile-user-1', author_kind: 'profile_uid' as const };
const abortSignal = new AbortController().signal;
const logger = { warn: jest.fn() };

const registerStepDefinition = jest.fn();
const getStorage = jest.fn().mockReturnValue(storage);
const getCoreSecurity = jest.fn().mockReturnValue(coreSecurity);
const getCurrentUserEsClient = jest.fn().mockReturnValue(currentUserEsClient);

const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    abortSignal,
    logger,
    contextManager: {
      getFakeRequest: () => request,
      getContext: () => ({ workflow: { spaceId: 'space-1' } }),
    },
  } as never);

const registerSteps = () => {
  registerMemoryWorkflowSteps(
    { registerStepDefinition } as never,
    getStorage as never,
    getCoreSecurity as never,
    getCurrentUserEsClient as never
  );

  const recallStep = registerStepDefinition.mock.calls[0][0];
  const rememberStepLoader = registerStepDefinition.mock.calls[1][0];
  const forgetStep = registerStepDefinition.mock.calls[2][0];
  return { recallStep, rememberStepLoader, forgetStep };
};

describe('registerMemoryWorkflowSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStorage.mockReturnValue(storage);
    getCoreSecurity.mockReturnValue(coreSecurity);
    getCurrentUserEsClient.mockReturnValue(currentUserEsClient);
    jest.mocked(resolveIdentity).mockReturnValue(identity);
  });

  it('registers memory.recall and delegates input to the shared recall core', async () => {
    jest.mocked(recallMemory).mockResolvedValue({
      memories: [
        {
          id: 'memory-1',
          title: 'Title',
          description: 'Description',
          tags: ['preference'],
          created_at: '2026-08-14T00:00:00.000Z',
          author: identity.author,
          author_kind: identity.author_kind,
          revision: 1,
        },
      ],
    });
    const { recallStep, rememberStepLoader, forgetStep } = registerSteps();
    const rememberStep = await rememberStepLoader();

    expect(registerStepDefinition).toHaveBeenCalledTimes(3);
    expect([recallStep.id, rememberStep.id, forgetStep.id]).toEqual([
      MEMORY_RECALL_STEP_ID,
      MEMORY_REMEMBER_STEP_ID,
      MEMORY_FORGET_STEP_ID,
    ]);
    const result = await recallStep.handler(
      createContext({
        query: 'recovery procedures',
        category: 'procedures',
        tags: ['project:phoenix', 'source:workflow'],
        limit: 4,
      })
    );

    expect(resolveIdentity).toHaveBeenCalledWith({
      request,
      security: coreSecurity,
    });
    expect(getCurrentUserEsClient).toHaveBeenCalledWith(request);
    expect(getStorage).toHaveBeenCalledWith(currentUserEsClient);
    expect(recallMemory).toHaveBeenCalledWith({
      storage,
      logger,
      params: {
        query: 'recovery procedures',
        category: 'procedures',
        tags: ['project:phoenix', 'source:workflow'],
        limit: 4,
        space_id: 'space-1',
        identity,
      },
    });
    expect(result.output.memories).toHaveLength(1);
    expect(recallStep.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('registers memory.remember without the legacy alias and delegates to write core', async () => {
    jest.mocked(writeMemory).mockResolvedValue({ id: 'memory-1', revision: 2, action: 'updated' });
    const { rememberStepLoader } = registerSteps();
    const rememberStep = await rememberStepLoader();

    expect(rememberStep.id).toBe(MEMORY_REMEMBER_STEP_ID);
    const result = await rememberStep.handler(
      createContext({
        title: 'Recover the memory index',
        description: 'Use the verified recovery sequence.',
        category: 'procedures',
        tags: ['sources'],
        expires_at: '2027-08-14T00:00:00.000Z',
      })
    );

    expect(resolveIdentity).toHaveBeenCalledWith({
      request,
      security: coreSecurity,
    });
    expect(getCurrentUserEsClient).toHaveBeenCalledWith(request);
    expect(getStorage).toHaveBeenCalledWith(currentUserEsClient);
    expect(writeMemory).toHaveBeenCalledWith({
      storage,
      esClient: currentUserEsClient,
      params: {
        title: 'Recover the memory index',
        description: 'Use the verified recovery sequence.',
        category: 'procedures',
        tags: ['sources'],
        expires_at: '2027-08-14T00:00:00.000Z',
        call_source: 'workflow',
        space_id: 'space-1',
        identity,
      },
    });
    expect(jest.mocked(writeMemory).mock.calls[0][0].params).not.toHaveProperty('type');
    expect(result.output).toEqual({ id: 'memory-1', revision: 2, action: 'updated' });
  });

  it.each(['deleted', 'not_found'] as const)(
    'registers memory.forget and returns %s from the shared tombstone core',
    async (result) => {
      jest.mocked(tombstoneMemory).mockResolvedValue({ result });
      const { forgetStep } = registerSteps();

      const response = await forgetStep.handler(createContext({ id: 'memory-1' }));

      expect(forgetStep.id).toBe(MEMORY_FORGET_STEP_ID);
      expect(getCurrentUserEsClient).toHaveBeenCalledWith(request);
      expect(getStorage).toHaveBeenCalledWith(currentUserEsClient);
      expect(tombstoneMemory).toHaveBeenCalledWith({
        storage,
        abortSignal,
        params: {
          id: 'memory-1',
          space_id: 'space-1',
          identity,
        },
      });
      expect(response.output).toEqual({ result });
      expect(forgetStep.outputSchema.parse(response.output)).toEqual(response.output);
    }
  );

  it('handles missing identity for recall, remember, and forget', async () => {
    jest.mocked(resolveIdentity).mockReturnValue(undefined);
    const { recallStep, rememberStepLoader, forgetStep } = registerSteps();
    const rememberStep = await rememberStepLoader();

    await expect(recallStep.handler(createContext({ query: 'recovery procedures' }))).resolves.toEqual({
      output: { memories: [] },
    });
    await expect(
      rememberStep.handler(
        createContext({ title: 'Preferred sources', description: 'Use primary sources.' })
      )
    ).rejects.toThrow('Cannot remember memory: no user identity available for scoping.');
    await expect(forgetStep.handler(createContext({ id: 'memory-1' }))).rejects.toThrow(
      'Cannot forget memory: no user identity available for scoping.'
    );

    expect(getCurrentUserEsClient).not.toHaveBeenCalled();
    expect(recallMemory).not.toHaveBeenCalled();
    expect(writeMemory).not.toHaveBeenCalled();
    expect(tombstoneMemory).not.toHaveBeenCalled();
  });
});
