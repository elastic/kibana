/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../helpers';
import { registerDefaultRepositoryRoutes } from './default_repository';
import type { RequestMock } from '../../test/helpers';
import { RouterMock, routeDependencies } from '../../test/helpers';

describe('[Snapshot and Restore API Routes] Default repository', () => {
  const router = new RouterMock();

  const getSettingsFn = router.getMockApiFn('cluster.getSettings');
  const putSettingsFn = router.getMockApiFn('cluster.putSettings');
  const getRepositoryFn = router.getMockApiFn('snapshot.getRepository');

  beforeAll(() => {
    registerDefaultRepositoryRoutes({
      ...routeDependencies,
      router,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('default_repository'),
    };

    it('should return null when no default repository is set', async () => {
      getSettingsFn.mockResolvedValue({ persistent: {} });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: { repositoryName: null },
      });
    });

    it('should return the default repository name from persistent settings', async () => {
      getSettingsFn.mockResolvedValue({
        persistent: { repositories: { default_repository: 'repoA' } },
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: { repositoryName: 'repoA' },
      });
    });

    it('should throw if ES error', async () => {
      getSettingsFn.mockRejectedValue(new Error('boom'));

      await expect(router.runRequest(mockRequest)).rejects.toThrowError('boom');
    });
  });

  describe('putHandler()', () => {
    const name = 'repoA';
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('default_repository'),
      query: { name },
    };

    it('should set the default repository and return the name', async () => {
      getRepositoryFn.mockResolvedValue({});
      putSettingsFn.mockResolvedValue({ acknowledged: true });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: { acknowledged: true, repositoryName: name },
      });

      expect(getRepositoryFn).toHaveBeenCalledWith({ name });
      expect(putSettingsFn).toHaveBeenCalledWith({
        persistent: { repositories: { default_repository: name } },
      });
    });

    it('should throw when repository does not exist', async () => {
      getRepositoryFn.mockRejectedValue(new Error('missing'));

      await expect(router.runRequest(mockRequest)).rejects.toThrowError('missing');
      expect(putSettingsFn).not.toHaveBeenCalled();
    });
  });
});
