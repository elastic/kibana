/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

import { useEnvironmentContext } from './use_environment_context';

describe('useEnvironmentContext', () => {
  it('returns undefined when cloud is not provided', () => {
    const http = httpServiceMock.createStartContract();

    const { result } = renderHook(() => useEnvironmentContext({ http }));

    expect(result.current).toBeUndefined();
  });

  it('returns deployment config for cloud deployments', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({ resourceData: { deployment: { name: 'My Deployment' } } });
    const cloud = {
      isCloudEnabled: true,
      deploymentUrl: 'https://cloud.elastic.co/deployment/123',
      deploymentsUrl: 'https://cloud.elastic.co/deployments',
    } as CloudStart;

    const { result } = renderHook(() => useEnvironmentContext({ cloud, http }));

    await waitFor(() => {
      expect(result.current?.name).toBe('My Deployment');
    });
    expect(result.current?.environmentType).toBe('deployment');
    expect(result.current?.submenuItems).toHaveLength(2);
    expect(result.current?.submenuItems[0]).toMatchObject({
      id: 'manage',
      label: 'Manage this deployment',
      href: 'https://cloud.elastic.co/deployment/123',
    });
    expect(result.current?.submenuItems[1]).toMatchObject({
      id: 'viewAll',
      label: 'View all deployments',
      href: 'https://cloud.elastic.co/deployments',
    });
  });

  it('returns project config for serverless', () => {
    const http = httpServiceMock.createStartContract();
    const cloud = {
      isCloudEnabled: true,
      serverless: { projectName: 'My Project' },
      deploymentUrl: 'https://cloud.elastic.co/project/456',
      projectsUrl: 'https://cloud.elastic.co/projects',
    } as CloudStart;

    const { result } = renderHook(() => useEnvironmentContext({ cloud, http, isServerless: true }));

    expect(result.current?.environmentType).toBe('project');
    expect(result.current?.name).toBe('My Project');
    expect(result.current?.submenuItems[0]).toMatchObject({
      id: 'manage',
      label: 'Manage this project',
    });
    expect(result.current?.submenuItems[1]).toMatchObject({
      id: 'viewAll',
      label: 'View all projects',
    });
  });
});
