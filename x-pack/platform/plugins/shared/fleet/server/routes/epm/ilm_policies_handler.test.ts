/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIlmPoliciesHandler } from './ilm_policies_handler';

describe('getIlmPoliciesHandler', () => {
  const hasPrivileges = jest.fn();
  const getLifecycle = jest.fn();
  const okBody = jest.fn();
  const response = { ok: okBody } as any;
  const context = {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            security: { hasPrivileges },
            ilm: { getLifecycle },
          },
        },
      },
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list when the user lacks the manage_ilm privilege', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });

    await getIlmPoliciesHandler(context, {} as any, response);

    expect(getLifecycle).not.toHaveBeenCalled();
    expect(okBody).toHaveBeenCalledWith({ body: { has_manage_ilm: false, items: [] } });
  });

  it('excludes managed and system policies, returning the rest sorted', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
    getLifecycle.mockResolvedValue({
      'my-custom-policy': { policy: {} },
      'another-policy': { policy: { _meta: {} } },
      logs: { policy: { _meta: { managed: true } } },
      metrics: { policy: { _meta: { managed: true } } },
      '.fleet-ilm-policy': { policy: {} },
    });

    await getIlmPoliciesHandler(context, {} as any, response);

    expect(okBody).toHaveBeenCalledWith({
      body: { has_manage_ilm: true, items: ['another-policy', 'my-custom-policy'] },
    });
  });
});
