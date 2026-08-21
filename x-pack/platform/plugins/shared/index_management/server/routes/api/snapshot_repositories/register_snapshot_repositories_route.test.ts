/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import { registerSnapshotRepositoriesRoute } from './register_snapshot_repositories_route';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies } from '../../../test/helpers';

describe('[Index management API Routes] Snapshot repositories', () => {
  const router = new RouterMock();

  const getSettings = router.getMockESApiFn('cluster.getSettings');
  const getRepository = router.getMockESApiFn('snapshot.getRepository');
  const hasPrivileges = router.getMockESApiFn('security.hasPrivileges');

  const mockRequest: RequestMock = {
    method: 'get',
    path: addBasePath('/snapshot_repositories'),
  };

  beforeEach(() => {
    getRepository.mockResolvedValue({});
  });

  beforeAll(() => {
    registerSnapshotRepositoriesRoute({
      ...routeDependencies,
      router,
    });
  });

  test('returns the configured default repository, existing repositories and canCreate', async () => {
    getSettings.mockResolvedValue({
      persistent: { repositories: { default_repository: 'found-snapshots' } },
    });
    getRepository.mockResolvedValue({ 'found-snapshots': { type: 'fs' } });
    hasPrivileges.mockResolvedValue({
      cluster: { 'cluster:admin/repository/put': true },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: true,
        defaultRepository: 'found-snapshots',
        hasRepositories: true,
        canCreateRepository: true,
      },
    });
  });

  test('reports existing repositories even when none is configured as default', async () => {
    getSettings.mockResolvedValue({});
    getRepository.mockResolvedValue({ 'my-repo': { type: 'fs' } });
    hasPrivileges.mockResolvedValue({
      cluster: { 'cluster:admin/repository/put': true },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: false,
        defaultRepository: undefined,
        hasRepositories: true,
        canCreateRepository: true,
      },
    });
  });

  test('reports no default repository when none is configured as default', async () => {
    getSettings.mockResolvedValue({});
    hasPrivileges.mockResolvedValue({
      cluster: { 'cluster:admin/repository/put': true },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: false,
        defaultRepository: undefined,
        hasRepositories: false,
        canCreateRepository: true,
      },
    });
  });

  test('reports no default repository and no create permission', async () => {
    getSettings.mockResolvedValue({});
    hasPrivileges.mockResolvedValue({
      cluster: { 'cluster:admin/repository/put': false },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: false,
        defaultRepository: undefined,
        hasRepositories: false,
        canCreateRepository: false,
      },
    });
  });

  test('defaults hasRepositories to false when listing repositories fails, without failing the endpoint', async () => {
    getSettings.mockResolvedValue({
      persistent: { repositories: { default_repository: 'found-snapshots' } },
    });
    getRepository.mockRejectedValue(
      Object.assign(new Error('missing privilege'), { statusCode: 403 })
    );
    hasPrivileges.mockResolvedValue({
      cluster: { 'cluster:admin/repository/put': true },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: true,
        defaultRepository: 'found-snapshots',
        hasRepositories: false,
        canCreateRepository: true,
      },
    });
  });

  test('reports canCreateRepository as true without checking privileges when security is disabled', async () => {
    (routeDependencies.config.isSecurityEnabled as jest.Mock).mockReturnValueOnce(false);
    getSettings.mockResolvedValue({});
    hasPrivileges.mockClear();

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: {
        hasDefaultRepository: false,
        defaultRepository: undefined,
        hasRepositories: false,
        canCreateRepository: true,
      },
    });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });
});
