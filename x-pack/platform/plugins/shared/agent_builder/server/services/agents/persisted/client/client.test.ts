/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getUserFromRequest, isAdminFromRequest } from '../../../utils';
import { createClient, type AgentClient } from './client';

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
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();
    getUserFromRequestMock.mockResolvedValue(mockUser);
    isAdminFromRequestMock.mockResolvedValue(false);
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
});
