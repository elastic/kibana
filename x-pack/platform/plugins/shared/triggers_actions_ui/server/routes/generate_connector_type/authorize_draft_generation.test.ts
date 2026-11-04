/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SUPERUSER_PRIVILEGES } from '@kbn/security-plugin/common';
import { authorizeDraftGeneration } from './authorize_draft_generation';

describe('authorizeDraftGeneration', () => {
  const request = {} as KibanaRequest;
  const makeSecurity = (hasAllRequested: boolean) => {
    const globally = jest.fn().mockResolvedValue({ hasAllRequested });
    const checkPrivilegesWithRequest = jest.fn().mockReturnValue({ globally });
    return {
      security: {
        authz: { checkPrivilegesWithRequest },
      } as unknown as SecurityPluginStart,
      globally,
      checkPrivilegesWithRequest,
    };
  };

  it('allows users with global superuser privileges', async () => {
    const { security, globally, checkPrivilegesWithRequest } = makeSecurity(true);

    await expect(authorizeDraftGeneration(security, request)).resolves.toBeUndefined();
    expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(globally).toHaveBeenCalledWith(SUPERUSER_PRIVILEGES);
  });

  it('rejects users without global superuser privileges', async () => {
    const { security } = makeSecurity(false);

    await expect(authorizeDraftGeneration(security, request)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });
});
