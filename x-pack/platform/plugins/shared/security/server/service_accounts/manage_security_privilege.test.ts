/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';

import { ensureManageSecurityPrivilege } from './manage_security_privilege';

describe('ensureManageSecurityPrivilege', () => {
  let logger: MockedLogger;
  let globally: jest.Mock;
  let checkPrivilegesWithRequest: jest.Mock;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    globally = jest.fn().mockResolvedValue({ hasAllRequested: true });
    checkPrivilegesWithRequest = jest.fn().mockReturnValue({ globally });
  });

  const check = (action = 'create a service account') =>
    ensureManageSecurityPrivilege({
      request: httpServerMock.createKibanaRequest(),
      checkPrivilegesWithRequest,
      logger,
      action,
    });

  it('checks the `manage_security` cluster privilege globally, for the given request', async () => {
    const request = httpServerMock.createKibanaRequest();

    await ensureManageSecurityPrivilege({
      request,
      checkPrivilegesWithRequest,
      logger,
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
});
