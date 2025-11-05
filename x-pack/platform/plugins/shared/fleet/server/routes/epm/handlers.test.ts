/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetUnauthorizedError } from '../../errors';
import { licenseService } from '../../services';

import { rollbackPackageHandler } from './handlers';

jest.mock('../../services', () => {
  return {
    licenseService: {
      isEnterprise: jest.fn(),
    },
  };
});

jest.mock('../../services/epm/packages/rollback', () => {
  return {
    rollbackInstallation: jest.fn(),
  };
});

jest.mock('./bulk_handler', () => {
  return {
    getPackagePolicyIdsForCurrentUser: jest.fn().mockResolvedValue({}),
  };
});

const context = {
  core: {
    elasticsearch: {
      client: {
        asIntegernalUser: jest.fn(),
      },
    },
  },
  fleet: {
    spaceId: 'default',
  },
} as any;
const request = {
  params: { pkgName: 'test-package' },
} as any;
const response = {
  ok: jest.fn(),
} as any;

describe('rollback package handler', () => {
  it('should throw if license is not enterprise', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);

    await expect(rollbackPackageHandler(context, request, response)).rejects.toThrow(
      FleetUnauthorizedError
    );
  });

  it('should continue if license is enterprise', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(true);

    await rollbackPackageHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
  });
});
