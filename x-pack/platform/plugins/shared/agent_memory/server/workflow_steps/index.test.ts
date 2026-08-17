/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { authorizeMemoryRequest } from '../core/authorize_request';
import { recallMemory } from '../core/recall_memory';
import { writeMemory } from '../core/write_memory';
import { MEMORY_RECALL_STEP_ID, MEMORY_REMEMBER_STEP_ID, registerMemoryWorkflowSteps } from '.';

jest.mock('../core/authorize_request');
jest.mock('../core/recall_memory');
jest.mock('../core/write_memory');

const request = { request: true };
const currentUserEsClient = { currentUser: true };
const storage = { storage: true };
const security = { security: true };
const coreSecurity = { coreSecurity: true };
const identity = { author: 'profile-user-1', author_kind: 'profile_uid' as const };

const registerStepDefinition = jest.fn();
const getStorage = jest.fn().mockReturnValue(storage);
const getSecurityStart = jest.fn().mockReturnValue(security);
const getCoreSecurity = jest.fn().mockReturnValue(coreSecurity);
const getCurrentUserEsClient = jest.fn().mockReturnValue(currentUserEsClient);

const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: () => request,
      getContext: () => ({ workflow: { spaceId: 'space-1' } }),
    },
  } as never);

const registerSteps = () => {
  registerMemoryWorkflowSteps(
    { registerStepDefinition } as never,
    getStorage as never,
    getSecurityStart as never,
    getCoreSecurity as never,
    getCurrentUserEsClient as never
  );

  const recallStep = registerStepDefinition.mock.calls[0][0];
  const rememberStepLoader = registerStepDefinition.mock.calls[1][0];
  return { recallStep, rememberStepLoader };
};

describe('registerMemoryWorkflowSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStorage.mockReturnValue(storage);
    getSecurityStart.mockReturnValue(security);
    getCoreSecurity.mockReturnValue(coreSecurity);
    getCurrentUserEsClient.mockReturnValue(currentUserEsClient);
    jest.mocked(authorizeMemoryRequest).mockResolvedValue({ status: 'authorized', identity });
  });

  it('registers memory.recall and memory.remember without a memory.retain alias', async () => {
    const { recallStep, rememberStepLoader } = registerSteps();
    const rememberStep = await rememberStepLoader();

    expect(recallStep.id).toBe(MEMORY_RECALL_STEP_ID);
    expect(rememberStep.id).toBe(MEMORY_REMEMBER_STEP_ID);
    expect([recallStep.id, rememberStep.id]).not.toContain('memory.retain');
  });

  it('authorizes and delegates recall input to the shared recall core', async () => {
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
    const { recallStep } = registerSteps();

    const result = await recallStep.handler(
      createContext({ query: 'preferences', category: 'preferences', limit: 4 })
    );

    expect(authorizeMemoryRequest).toHaveBeenCalledWith({
      request,
      spaceId: 'space-1',
      privilege: 'read_agent_memory',
      security,
      coreSecurity,
    });
    expect(getCurrentUserEsClient).toHaveBeenCalledWith(request);
    expect(getStorage).toHaveBeenCalledWith(currentUserEsClient);
    expect(recallMemory).toHaveBeenCalledWith({
      storage,
      params: {
        query: 'preferences',
        category: 'preferences',
        limit: 4,
        space_id: 'space-1',
        identity,
      },
    });
    expect(result.output.memories).toHaveLength(1);
    expect(recallStep.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('authorizes and delegates remember input to the shared write core', async () => {
    jest.mocked(writeMemory).mockResolvedValue({ id: 'memory-1', revision: 2, action: 'updated' });
    const { rememberStepLoader } = registerSteps();
    const rememberStep = await rememberStepLoader();

    const result = await rememberStep.handler(
      createContext({
        title: 'Preferred sources',
        description: 'Use primary sources.',
        category: 'preferences',
        type: 'semantic',
        tags: ['sources'],
        expires_at: '2027-08-14T00:00:00.000Z',
      })
    );

    expect(authorizeMemoryRequest).toHaveBeenCalledWith({
      request,
      spaceId: 'space-1',
      privilege: 'write_agent_memory',
      security,
      coreSecurity,
    });
    expect(getCurrentUserEsClient).toHaveBeenCalledWith(request);
    expect(getStorage).toHaveBeenCalledWith(currentUserEsClient);
    expect(writeMemory).toHaveBeenCalledWith({
      storage,
      esClient: currentUserEsClient,
      params: {
        title: 'Preferred sources',
        description: 'Use primary sources.',
        category: 'preferences',
        type: 'semantic',
        tags: ['sources'],
        expires_at: '2027-08-14T00:00:00.000Z',
        call_source: 'workflow',
        space_id: 'space-1',
        identity,
      },
    });
    expect(result.output).toEqual({ id: 'memory-1', revision: 2, action: 'updated' });
  });
});
