/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { assertCanChangeInvestigation } from './assert_investigation_post_access';

const request = {} as KibanaRequest;

const securityWith = (hasAllRequested: boolean): SecurityPluginStart => {
  const atSpace = jest.fn().mockResolvedValue({ hasAllRequested });
  return {
    authz: {
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({ atSpace }),
      actions: { api: { get: jest.fn().mockReturnValue('api:manage_investigations') } },
    },
  } as unknown as SecurityPluginStart;
};

describe('assertCanChangeInvestigation', () => {
  it('allows the post when the security plugin is not installed', async () => {
    await expect(
      assertCanChangeInvestigation({ request, spaceId: 'default', security: undefined })
    ).resolves.toBeUndefined();
  });

  it('allows the post when the caller can manage investigations', async () => {
    const security = securityWith(true);
    await expect(
      assertCanChangeInvestigation({ request, spaceId: 'default', security })
    ).resolves.toBeUndefined();
    expect(security.authz.checkPrivilegesWithRequest(request).atSpace).toHaveBeenCalledWith(
      'default',
      { kibana: ['api:manage_investigations'] }
    );
  });

  it('rejects the post when the caller cannot manage investigations', async () => {
    await expect(
      assertCanChangeInvestigation({
        request,
        spaceId: 'default',
        security: securityWith(false),
      })
    ).rejects.toThrow("You don't have permission to change this investigation.");
  });
});
