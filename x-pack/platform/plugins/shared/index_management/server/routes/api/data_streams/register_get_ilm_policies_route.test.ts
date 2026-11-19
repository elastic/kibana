/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import { registerGetIlmPoliciesRoute } from './register_get_ilm_policies_route';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies } from '../../../test/helpers';

describe('[Index management API Routes] Data streams ILM policies', () => {
  const router = new RouterMock();

  const getLifecycle = router.getMockESApiFn('ilm.getLifecycle');
  const hasPrivileges = router.getMockESApiFn('security.hasPrivileges');

  const mockRequest: RequestMock = {
    method: 'get',
    path: addBasePath('/data_streams/ilm_policies'),
  };

  beforeAll(() => {
    registerGetIlmPoliciesRoute({
      ...routeDependencies,
      router,
    });
  });

  test('reports manage_ilm and returns the mapped policies', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
    getLifecycle.mockResolvedValue({
      my_policy: {
        policy: {
          phases: {
            hot: { min_age: '0ms', actions: {} },
            delete: { min_age: '30d', actions: { delete: {} } },
          },
        },
      },
    });

    const { body } = await router.runRequest(mockRequest);

    expect(body.hasManageIlm).toBe(true);
    expect(body.policies).toHaveLength(1);
    expect(body.policies[0].name).toBe('my_policy');
  });

  test('sets isManaged to true for policies with _meta.managed = true', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
    getLifecycle.mockResolvedValue({
      managed_policy: {
        policy: {
          _meta: { managed: true },
          phases: {
            hot: { min_age: '0ms', actions: {} },
          },
        },
      },
      regular_policy: {
        policy: {
          phases: {
            hot: { min_age: '0ms', actions: {} },
          },
        },
      },
    });

    const { body } = await router.runRequest(mockRequest);

    expect(body.policies).toHaveLength(2);
    const managed = body.policies.find((p: { name: string }) => p.name === 'managed_policy');
    const regular = body.policies.find((p: { name: string }) => p.name === 'regular_policy');
    expect(managed.isManaged).toBe(true);
    expect(regular.isManaged).toBeUndefined();
  });

  test('reports no manage_ilm and degrades to an empty list when policies cannot be read', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });
    getLifecycle.mockRejectedValue(
      Object.assign(new Error('missing privilege'), { statusCode: 403 })
    );

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { hasManageIlm: false, policies: [] },
    });
  });

  test('reports manage_ilm as true without checking privileges when security is disabled', async () => {
    (routeDependencies.config.isSecurityEnabled as jest.Mock).mockReturnValueOnce(false);
    hasPrivileges.mockClear();
    getLifecycle.mockResolvedValue({});

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { hasManageIlm: true, policies: [] },
    });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });
});
