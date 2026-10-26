/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { changeAgentPrivilegeLevel } from '../../services/agents';
import { FleetUnauthorizedError } from '../../errors';

import { changeAgentPrivilegeLevelHandler } from './change_privilege_level_handlers';

jest.mock('../../services/agents', () => ({
  changeAgentPrivilegeLevel: jest.fn(),
}));

describe('Change privilege level handlers', () => {
  describe('changeAgentPrivilegeLevelHandler', () => {
    let esClientMock: jest.Mocked<ElasticsearchClient>;
    let soClientMock: jest.Mocked<SavedObjectsClientContract>;
    let mockContext: any;
    let mockRequest: any;
    let mockResponse: jest.Mocked<KibanaResponseFactory>;

    const agentId = 'agent-id';
    const options = {
      user_info: { username: 'user', password: 'password' },
    };
    const mockActionResponse = { id: 'action-id' };

    beforeEach(() => {
      jest.clearAllMocks();

      esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
      soClientMock = savedObjectsClientMock.create();
      mockContext = {
        core: {
          elasticsearch: {
            client: {
              asInternalUser: esClientMock,
            },
          },
          savedObjects: {
            client: soClientMock,
          },
        },
        fleet: {},
      };
      mockRequest = {
        params: { agentId },
        body: options,
      };
      mockResponse = httpServerMock.createResponseFactory();
    });

    it('returns success if agent privilege level can be changed', async () => {
      (changeAgentPrivilegeLevel as jest.Mock).mockResolvedValue({
        actionId: mockActionResponse.id,
      });

      await changeAgentPrivilegeLevelHandler(mockContext, mockRequest, mockResponse);

      expect(changeAgentPrivilegeLevel).toHaveBeenCalledWith(esClientMock, soClientMock, agentId, {
        user_info: options.user_info,
      });

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionId: mockActionResponse.id },
      });
    });

    it('returns 403 if agent privilege level cannot be changed', async () => {
      (changeAgentPrivilegeLevel as jest.Mock).mockRejectedValue(
        new FleetUnauthorizedError('Cannot remove root privilege')
      );

      await expect(
        changeAgentPrivilegeLevelHandler(mockContext, mockRequest, mockResponse)
      ).rejects.toThrow('Cannot remove root privilege');
    });
  });
});
