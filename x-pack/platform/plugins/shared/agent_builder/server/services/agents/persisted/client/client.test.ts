/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isAgentNotFoundError } from '@kbn/agent-builder-common';
import { buildReadAccessFilter } from '../../access_control';
import { getUserFromRequest, isAdminFromRequest } from '../../../utils';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import { createClient, createSystemClient, type AgentClient } from './client';

const testSpace = 'default';
const mockUser = { id: 'user-1', username: 'test-user' };

interface MockEsClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
  bulk: jest.Mock;
}

const mockEsClient: MockEsClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
  bulk: jest.fn(),
};

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
}));

jest.mock('../../../utils', () => ({
  getUserFromRequest: jest.fn(),
  isAdminFromRequest: jest.fn(),
}));

const getUserFromRequestMock = getUserFromRequest as jest.MockedFunction<typeof getUserFromRequest>;
const isAdminFromRequestMock = isAdminFromRequest as jest.MockedFunction<typeof isAdminFromRequest>;

describe('AgentClient', () => {
  let client: AgentClient;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(async () => {
    logger = loggerMock.create();
    jest.clearAllMocks();
    getUserFromRequestMock.mockResolvedValue(mockUser);
    isAdminFromRequestMock.mockResolvedValue(false);

    client = await createClient({
      space: testSpace,
      logger,
      request: {} as never,
      security: {} as never,
      toolsService: {} as never,
      elasticsearch: {
        client: {
          asScoped: jest.fn(() => ({
            asCurrentUser: {},
            asInternalUser: {},
          })),
        },
      } as never,
    });
  });

  describe('getIds', () => {
    it('fetches only agent ids with the same read filters used for listing', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            { _id: 'agent-1', _source: { id: 'agent-1' } },
            { _id: 'agent-2', _source: { id: 'agent-2' } },
          ],
        },
      });

      const ids = await client.getIds();

      expect(ids).toEqual(['agent-1', 'agent-2']);
      expect(mockEsClient.search).toHaveBeenCalledWith({
        track_total_hits: false,
        size: 1000,
        _source: ['id'],
        query: {
          bool: {
            filter: [createSpaceDslFilter(testSpace), buildReadAccessFilter({ user: mockUser })],
          },
        },
      });
    });

    it('falls back to the document id for legacy agent documents without an id field', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'legacy-agent', _source: {} }],
        },
      });

      await expect(client.getIds()).resolves.toEqual(['legacy-agent']);
    });

    it('omits the read access filter for admin users', async () => {
      isAdminFromRequestMock.mockResolvedValue(true);
      client = await createClient({
        space: testSpace,
        logger,
        request: {} as never,
        security: {} as never,
        toolsService: {} as never,
        elasticsearch: {
          client: {
            asScoped: jest.fn(() => ({
              asCurrentUser: {},
              asInternalUser: {},
            })),
          },
        } as never,
      });
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.getIds();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [createSpaceDslFilter(testSpace)],
            },
          },
        })
      );
    });
  });

  describe('pre-execution workflow configuration', () => {
    // A tools service whose registry accepts any tool, so tool validation never interferes
    // with the workflow-gating assertions under test.
    const toolsService = {
      getRegistry: jest.fn().mockResolvedValue({ has: jest.fn().mockResolvedValue(true) }),
    };

    const buildClient = (isAdmin: boolean): Promise<AgentClient> => {
      isAdminFromRequestMock.mockResolvedValue(isAdmin);
      return createClient({
        space: testSpace,
        logger,
        request: {} as never,
        security: {} as never,
        toolsService: toolsService as never,
        elasticsearch: {
          client: {
            asScoped: jest.fn(() => ({
              asCurrentUser: {},
              asInternalUser: {},
            })),
          },
        } as never,
      });
    };

    const buildCreateProfile = (workflowIds?: string[]) => ({
      id: 'agent-1',
      name: 'Agent 1',
      description: 'desc',
      configuration: {
        tools: [],
        ...(workflowIds !== undefined ? { workflow_ids: workflowIds } : {}),
      },
    });

    // Builds a persisted agent document owned by the current user (so non-admins retain write
    // access) with the given stored workflow IDs.
    const buildDoc = (workflowIds?: string[]) => ({
      _id: 'agent-1',
      _source: {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'chat',
        space: testSpace,
        description: 'desc',
        created_by_id: mockUser.id,
        created_by_name: mockUser.username,
        access_control: { access_mode: 'public', entries: [] },
        config: {
          tools: [],
          ...(workflowIds !== undefined ? { workflow_ids: workflowIds } : {}),
        },
        created_at: '2020-01-01T00:00:00.000Z',
        updated_at: '2020-01-01T00:00:00.000Z',
      },
    });

    describe('create', () => {
      it('rejects a non-admin attaching workflow_ids', async () => {
        const nonAdminClient = await buildClient(false);
        mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

        await expect(nonAdminClient.create(buildCreateProfile(['wf-1']) as never)).rejects.toThrow(
          'Only administrators can configure pre-execution workflows.'
        );
        expect(mockEsClient.index).not.toHaveBeenCalled();
      });

      it('allows a non-admin to create without workflow_ids', async () => {
        const nonAdminClient = await buildClient(false);
        mockEsClient.search
          .mockResolvedValueOnce({ hits: { hits: [] } })
          .mockResolvedValue({ hits: { hits: [buildDoc()] } });

        await nonAdminClient.create(buildCreateProfile() as never);

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      });

      it('allows an admin to attach workflow_ids', async () => {
        const adminClient = await buildClient(true);
        mockEsClient.search
          .mockResolvedValueOnce({ hits: { hits: [] } })
          .mockResolvedValue({ hits: { hits: [buildDoc(['wf-1'])] } });

        await adminClient.create(buildCreateProfile(['wf-1']) as never);

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      });
    });

    describe('update', () => {
      it('rejects a non-admin changing workflow_ids', async () => {
        const nonAdminClient = await buildClient(false);
        mockEsClient.search.mockResolvedValue({ hits: { hits: [buildDoc(['wf-1'])] } });

        await expect(
          nonAdminClient.update('agent-1', { configuration: { workflow_ids: ['wf-2'] } } as never)
        ).rejects.toThrow('Only administrators can configure pre-execution workflows.');
        expect(mockEsClient.index).not.toHaveBeenCalled();
      });

      it('allows a non-admin to echo back the unchanged workflow_ids', async () => {
        const nonAdminClient = await buildClient(false);
        mockEsClient.search.mockResolvedValue({ hits: { hits: [buildDoc(['wf-1'])] } });

        await nonAdminClient.update('agent-1', {
          configuration: { workflow_ids: ['wf-1'] },
        } as never);

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      });

      it('allows an admin to change workflow_ids', async () => {
        const adminClient = await buildClient(true);
        mockEsClient.search.mockResolvedValue({ hits: { hits: [buildDoc(['wf-1'])] } });

        await adminClient.update('agent-1', {
          configuration: { workflow_ids: ['wf-2'] },
        } as never);

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('ensureDefaultAgent', () => {
    const profile = {
      id: 'agent-1',
      name: 'Agent 1',
      description: 'desc',
      configuration: { tools: [] },
    };

    const conflictError = Object.assign(new Error('version_conflict_engine_exception'), {
      statusCode: 409,
    });

    const buildDoc = () => ({
      _id: 'agent-1',
      _source: {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'chat',
        space: testSpace,
        description: 'desc',
        created_by_name: 'system',
        access_control: { access_mode: 'public', entries: [] },
        config: { tools: [] },
        created_at: '2020-01-01T00:00:00.000Z',
        updated_at: '2020-01-01T00:00:00.000Z',
      },
    });

    const emptyHits = { hits: { hits: [] } };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('creates and returns the default agent', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(emptyHits)
        .mockResolvedValue({ hits: { hits: [buildDoc()] } });
      mockEsClient.index.mockResolvedValue({});

      await expect(client.ensureDefaultAgent(profile as never)).resolves.toMatchObject({
        id: 'agent-1',
      });
    });

    it('retries the read until a concurrently created agent becomes searchable', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(emptyHits) // existence pre-check
        .mockResolvedValueOnce(emptyHits) // read-back before the winner's refresh
        .mockResolvedValueOnce(emptyHits)
        .mockResolvedValue({ hits: { hits: [buildDoc()] } });
      mockEsClient.index.mockRejectedValue(conflictError);

      const promise = client.ensureDefaultAgent(profile as never);
      await jest.advanceTimersByTimeAsync(1000);

      await expect(promise).resolves.toMatchObject({ id: 'agent-1' });
      expect(mockEsClient.search).toHaveBeenCalledTimes(4);
    });

    it('rejects with not found when the agent never becomes searchable', async () => {
      mockEsClient.search.mockResolvedValue(emptyHits);
      mockEsClient.index.mockRejectedValue(conflictError);

      const promise = client.ensureDefaultAgent(profile as never);
      promise.catch(() => {
        // prevent unhandled rejection while timers advance
      });
      await jest.advanceTimersByTimeAsync(10_000);

      const error = await promise.catch((e) => e);
      expect(isAgentNotFoundError(error)).toBe(true);
    });

    it('does not retry the read on non-not-found errors', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(emptyHits)
        .mockRejectedValue(new Error('search failure'));
      mockEsClient.index.mockRejectedValue(conflictError);

      await expect(client.ensureDefaultAgent(profile as never)).rejects.toThrow('search failure');
      expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    });
  });
});

describe('SystemAgentClient', () => {
  const profile = {
    id: 'platform.sig_events.test-agent',
    type: 'platform.test.type',
    name: 'System agent',
    description: 'Installed at startup',
    configuration: { tools: [], connector_ids: [] },
  };

  const buildDoc = (type = profile.type) => ({
    _id: `default_${profile.id}`,
    _source: {
      id: profile.id,
      name: profile.name,
      type,
      space: testSpace,
      description: profile.description,
      created_by_name: 'system',
      access_control: { access_mode: 'public', entries: [] },
      config: profile.configuration,
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-01T00:00:00.000Z',
    },
  });

  const createSystemAgentClient = () =>
    createSystemClient({
      space: testSpace,
      logger: loggerMock.create(),
      elasticsearch: { client: { asInternalUser: {} } } as never,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a system-owned agent without a request', async () => {
    mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

    await createSystemAgentClient().ensureAgent(profile);

    expect(mockEsClient.index).toHaveBeenCalledWith({
      id: `${testSpace}_${profile.id}`,
      op_type: 'create',
      document: expect.objectContaining({
        id: profile.id,
        type: profile.type,
        space: testSpace,
        created_by_name: 'system',
      }),
    });
  });

  it('preserves an existing agent', async () => {
    mockEsClient.search.mockResolvedValue({ hits: { hits: [buildDoc()] } });

    await createSystemAgentClient().ensureAgent(profile);

    expect(mockEsClient.index).not.toHaveBeenCalled();
  });

  it('rejects an existing agent with a different type', async () => {
    mockEsClient.search.mockResolvedValue({ hits: { hits: [buildDoc('chat')] } });

    await expect(createSystemAgentClient().ensureAgent(profile)).rejects.toThrow(
      'the id is already used by an agent of type "chat"'
    );
  });

  describe('concurrent creation', () => {
    const conflictError = Object.assign(new Error('version_conflict_engine_exception'), {
      statusCode: 409,
    });

    it('treats a concurrent create by another caller as success', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockRejectedValue(conflictError);

      await expect(createSystemAgentClient().ensureAgent(profile)).resolves.toBeUndefined();
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-conflict index errors', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockRejectedValue(new Error('mapping failure'));

      await expect(createSystemAgentClient().ensureAgent(profile)).rejects.toThrow(
        'mapping failure'
      );
    });
  });
});
