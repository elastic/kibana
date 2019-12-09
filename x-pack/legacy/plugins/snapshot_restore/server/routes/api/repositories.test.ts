/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import {
  registerRepositoriesRoutes,
  createHandler,
  deleteHandler,
  getAllHandler,
  getOneHandler,
  getTypesHandler,
  getVerificationHandler,
  updateHandler,
} from './repositories';

describe('[Snapshot and Restore API Routes] Repositories', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;
  const mockCallWithInternalUser = jest.fn().mockReturnValue({
    persistent: {
      'cluster.metadata.managed_repository': 'found-snapshots',
    },
  });

  registerRepositoriesRoutes(
    {
      // @ts-ignore
      get: () => {},
      // @ts-ignore
      post: () => {},
      // @ts-ignore
      put: () => {},
      // @ts-ignore
      delete: () => {},
      // @ts-ignore
      patch: () => {},
    },
    {
      cloud: { isCloudEnabled: false },
      elasticsearch: { getCluster: () => ({ callWithInternalUser: mockCallWithInternalUser }) },
    }
  );

  describe('getAllHandler()', () => {
    it('should arrify repositories returned from ES', async () => {
      const mockRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockPolicyEsResponse = {
        my_policy: {
          policy: {
            repository: 'found-snapshots',
          },
        },
      };

      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockRepositoryEsResponse)
        .mockReturnValueOnce(mockPolicyEsResponse);

      const expectedResponse = {
        repositories: [
          {
            name: 'fooRepository',
            type: '',
            settings: {},
          },
          {
            name: 'barRepository',
            type: '',
            settings: {},
          },
        ],
        managedRepository: {
          name: 'found-snapshots',
          policy: 'my_policy',
        },
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockRepositoryEsResponse = {};
      const mockPolicyEsResponse = {
        my_policy: {
          policy: {
            repository: 'found-snapshots',
          },
        },
      };

      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockRepositoryEsResponse)
        .mockReturnValueOnce(mockPolicyEsResponse);

      const expectedResponse = {
        repositories: [],
        managedRepository: {
          name: 'found-snapshots',
          policy: 'my_policy',
        },
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getOneHandler()', () => {
    const name = 'fooRepository';
    const mockOneRequest = ({
      params: {
        name,
      },
    } as unknown) as Request;

    it('should return repository object if returned from ES', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: { count: null },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty repository object if not returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      const expectedResponse = {
        repository: {},
        snapshots: {},
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return snapshot count from ES', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };
      const mockEsSnapshotResponse = {
        snapshots: [{}, {}],
      };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce(mockEsSnapshotResponse);
      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: {
          count: 2,
        },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return null snapshot count if ES error', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };
      const mockEsSnapshotError = new Error('snapshot error');
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockRejectedValueOnce(mockEsSnapshotError);
      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: {
          count: null,
        },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getVerificationHandler', () => {
    const name = 'fooRepository';
    const mockVerificationRequest = ({
      params: {
        name,
      },
    } as unknown) as Request;

    it('should return repository verification response if returned from ES', async () => {
      const mockEsResponse = { nodes: {} };
      const callWithRequest = jest.fn().mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = {
        verification: { valid: true, response: mockEsResponse },
      };
      await expect(
        getVerificationHandler(mockVerificationRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return repository verification error if returned from ES', async () => {
      const mockEsResponse = { error: {}, status: 500 };
      const callWithRequest = jest.fn().mockRejectedValueOnce(mockEsResponse);
      const expectedResponse = {
        verification: { valid: false, error: mockEsResponse },
      };
      await expect(
        getVerificationHandler(mockVerificationRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });
  });

  describe('getTypesHandler()', () => {
    it('should return default types if no repository plugins returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn();
      mockCallWithInternalUser.mockReturnValueOnce(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return default types with any repository plugins returned from ES', async () => {
      const pluginNames = Object.keys(REPOSITORY_PLUGINS_MAP);
      const pluginTypes = Object.entries(REPOSITORY_PLUGINS_MAP).map(([key, value]) => value);
      const mockEsResponse = [...pluginNames.map(key => ({ component: key }))];
      const callWithRequest = jest.fn();
      mockCallWithInternalUser.mockReturnValueOnce(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES, ...pluginTypes];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should not return non-repository plugins returned from ES', async () => {
      const pluginNames = ['foo-plugin', 'bar-plugin'];
      const mockEsResponse = [...pluginNames.map(key => ({ component: key }))];
      const callWithRequest = jest.fn();
      mockCallWithInternalUser.mockReturnValueOnce(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getOneHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('createHandler()', () => {
    const name = 'fooRepository';
    const mockCreateRequest = ({
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({})
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return error if repository with the same name already exists', async () => {
      const mockEsResponse = { [name]: {} };
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({})
        .mockRejectedValueOnce(new Error());
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('updateHandler()', () => {
    const name = 'fooRepository';
    const mockCreateRequest = ({
      params: {
        name,
      },
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({ [name]: {} })
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('deleteHandler()', () => {
    const names = ['fooRepository', 'barRepository'];
    const mockCreateRequest = ({
      params: {
        names: names.join(','),
      },
    } as unknown) as Request;

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockResolvedValueOnce(mockEsResponse)
        .mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = { itemsDeleted: names, errors: [] };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return error ES responses', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(mockEsError)
        .mockRejectedValueOnce(mockEsError);
      const expectedResponse = {
        itemsDeleted: [],
        errors: names.map(name => ({
          name,
          error: mockEsError,
        })),
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return combination of ES successes and errors', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(mockEsError)
        .mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = {
        itemsDeleted: [names[1]],
        errors: [
          {
            name: names[0],
            error: mockEsError,
          },
        ],
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });
  });
});
