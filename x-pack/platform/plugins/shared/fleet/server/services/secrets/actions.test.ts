/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';
import type { NewAgentAction } from '../../../common/types';

import { deleteActionSecrets, extractAndWriteActionSecrets } from './actions';

describe('Action Secrets', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  const esClientMock = elasticsearchServiceMock.createInternalClient();
  esClientMock.transport.request.mockImplementation(async (req) => {
    return {
      id: uuidv4(),
    };
  });

  beforeEach(() => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);

    esClientMock.transport.request.mockClear();
  });

  const action: NewAgentAction = {
    type: 'PRIVILEGE_LEVEL_CHANGE',
    agents: ['agent1'],
    data: {
      user_info: {
        username: 'user1',
        groupname: 'group1',
      },
    },
    secrets: {
      user_info: {
        password: 'password1',
      },
      enrollment_token: 'enrollment_token1',
    },
  };

  describe('extractAndWriteActionSecrets', () => {
    it('should create new secrets', async () => {
      const res = await extractAndWriteActionSecrets({
        action,
        esClient: esClientMock,
      });
      expect(res.actionWithSecrets).toEqual({
        ...action,
        secrets: {
          user_info: {
            password: {
              id: expect.any(String),
            },
          },
          enrollment_token: {
            id: expect.any(String),
          },
        },
      });
      expect(res.secretReferences).toEqual([{ id: expect.anything() }, { id: expect.anything() }]);
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            body: {
              value: 'password1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
        [
          {
            body: {
              value: 'enrollment_token1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
      ]);
    });
  });

  describe('deleteActionSecrets', () => {
    it('should delete secrets', async () => {
      const actionWithSecrets = {
        ...action,
        secrets: {
          user_info: {
            password: {
              id: '7jCKYZUBBY96FE7DX6L1',
            },
          },
          enrollment_token: {
            id: '7jCKYZUBBY96FE7DX6L2',
          },
        },
      } as any;
      await deleteActionSecrets({
        action: actionWithSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
          },
        ],
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L2',
          },
        ],
      ]);
    });
  });
});
