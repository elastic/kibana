/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import { createImpactPrivilegesChecker } from './check_impact_privileges';
import { ImpactForbiddenError } from './errors';

const request = httpServerMock.createKibanaRequest();

const createSecurity = (hasAllRequested: boolean) => {
  const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
  return {
    security: {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    } as unknown as SecurityPluginStart,
    checkPrivileges,
  };
};

const createChecker = (security?: SecurityPluginStart) => {
  const logger = loggerMock.create();
  return {
    checker: createImpactPrivilegesChecker({
      getSecurity: async () => security,
      logger,
    }),
    logger,
  };
};

describe('createImpactPrivilegesChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve a read when the principal can manage investigations', async () => {
    const { security, checkPrivileges } = createSecurity(true);
    const { checker } = createChecker(security);

    await expect(checker.assertCanRead(request)).resolves.toBeUndefined();

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [`api:${INVESTIGATIONS_API_PRIVILEGE_MANAGE}`],
    });
  });

  it('should throw when the principal does not hold it', async () => {
    const { security } = createSecurity(false);
    const { checker } = createChecker(security);

    await expect(checker.assertCanRead(request)).rejects.toBeInstanceOf(ImpactForbiddenError);
  });

  it('should deny the check when security is unavailable', async () => {
    const { checker, logger } = createChecker(undefined);

    await expect(checker.assertCanRead(request)).rejects.toBeInstanceOf(ImpactForbiddenError);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fails closed'));
  });

  it('should resolve a write when the principal can manage investigations', async () => {
    const { security, checkPrivileges } = createSecurity(true);
    const { checker } = createChecker(security);

    await expect(checker.assertCanManage(request)).resolves.toBeUndefined();

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [`api:${INVESTIGATIONS_API_PRIVILEGE_MANAGE}`],
    });
  });

  it('should throw when the principal cannot manage investigations', async () => {
    const { security } = createSecurity(false);
    const { checker } = createChecker(security);

    await expect(checker.assertCanManage(request)).rejects.toBeInstanceOf(ImpactForbiddenError);
  });
});
