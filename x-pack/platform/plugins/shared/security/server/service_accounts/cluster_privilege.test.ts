/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';

import {
  clusterPrivilegeRefusal,
  ensureClusterPrivilege,
  hasClusterPrivilege,
} from './cluster_privilege';

describe('ensureClusterPrivilege', () => {
  let logger: MockedLogger;
  let globally: jest.Mock;
  let checkPrivilegesWithRequest: jest.Mock;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    globally = jest.fn().mockResolvedValue({ hasAllRequested: true });
    checkPrivilegesWithRequest = jest.fn().mockReturnValue({ globally });
  });

  const check = (action = 'create a service account') =>
    ensureClusterPrivilege({
      request: httpServerMock.createKibanaRequest(),
      checkPrivilegesWithRequest,
      logger,
      privilege: 'manage_security',
      action,
    });

  it('checks the given cluster privilege globally, for the given request', async () => {
    const request = httpServerMock.createKibanaRequest();

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest,
      logger,
      privilege: 'manage_security',
      action: 'create a service account',
    });

    expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(globally).toHaveBeenCalledWith({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });
  });

  it('resolves quietly when the privilege is held', async () => {
    await expect(check()).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rejects with a 403 naming the action when the privilege is missing', async () => {
    globally.mockResolvedValue({ hasAllRequested: false });

    await expect(check('bind a service account to a workload')).rejects.toMatchObject({
      message:
        'Cannot bind a service account to a workload: missing `manage_security` cluster privilege',
      output: { statusCode: 403 },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Refused to bind a service account to a workload: missing `manage_security` cluster privilege'
    );
  });

  it('propagates a failed privilege check rather than treating it as a refusal', async () => {
    globally.mockRejectedValue(new Error('cluster unavailable'));

    await expect(check()).rejects.toThrowError('cluster unavailable');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  describe('onRefused', () => {
    const checkWith = (onRefused: jest.Mock) =>
      ensureClusterPrivilege({
        request: httpServerMock.createKibanaRequest(),
        checkPrivilegesWithRequest,
        logger,
        privilege: 'manage_security',
        action: 'create a service account',
        onRefused,
      });

    it('is called with the 403 that is then thrown', async () => {
      globally.mockResolvedValue({ hasAllRequested: false });
      const onRefused = jest.fn();

      const rejection = await checkWith(onRefused).catch((e) => e);

      expect(onRefused).toHaveBeenCalledTimes(1);
      expect(onRefused).toHaveBeenCalledWith(rejection);
      expect(rejection.output.statusCode).toBe(403);
    });

    it('is not called when the privilege is held', async () => {
      const onRefused = jest.fn();

      await checkWith(onRefused);

      expect(onRefused).not.toHaveBeenCalled();
    });

    it('is not called when the check itself fails', async () => {
      globally.mockRejectedValue(new Error('cluster unavailable'));
      const onRefused = jest.fn();

      await expect(checkWith(onRefused)).rejects.toThrowError('cluster unavailable');
      expect(onRefused).not.toHaveBeenCalled();
    });
  });
});

describe('hasClusterPrivilege', () => {
  it('answers whether the request holds the privilege, without refusing or logging', async () => {
    const globally = jest.fn().mockResolvedValue({ hasAllRequested: false });
    const request = httpServerMock.createKibanaRequest();

    await expect(
      hasClusterPrivilege({
        request,
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
        privilege: 'manage_security',
      })
    ).resolves.toBe(false);
    expect(globally).toHaveBeenCalledWith({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });
  });
});

describe('clusterPrivilegeRefusal', () => {
  it('logs the refusal and returns the 403 that ensureClusterPrivilege would throw', () => {
    const logger = loggingSystemMock.createLogger();

    const error = clusterPrivilegeRefusal({
      logger,
      privilege: 'manage_security',
      action: 'unbind a service account from a workload',
    });

    expect(error).toMatchObject({
      message:
        'Cannot unbind a service account from a workload: missing `manage_security` cluster privilege',
      output: { statusCode: 403 },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Refused to unbind a service account from a workload: missing `manage_security` cluster privilege'
    );
  });
});
