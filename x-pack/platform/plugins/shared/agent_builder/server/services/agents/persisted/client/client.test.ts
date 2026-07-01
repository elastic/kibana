/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { buildReadAccessFilter } from '../../access_control';
import { getUserFromRequest, isAdminFromRequest } from '../../../utils';
import { createSpaceDslFilter } from '../../../../utils/spaces';
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
});
