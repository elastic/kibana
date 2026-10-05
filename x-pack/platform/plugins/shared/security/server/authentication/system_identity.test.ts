/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { UiamSystemIdentity } from './system_identity';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('UiamSystemIdentity', () => {
  let uiam: ReturnType<typeof uiamServiceMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let systemIdentity: UiamSystemIdentity;

  beforeEach(() => {
    uiam = uiamServiceMock.create();
    logger = loggingSystemMock.createLogger();
    systemIdentity = new UiamSystemIdentity({ logger, uiam });
  });

  it('returns the token from a project service account authentication response', async () => {
    uiam.authenticateAsKibana.mockResolvedValue({
      type: 'project',
      project_id: 'project-1',
      project_type: 'elasticsearch',
      organization_id: 'org-1',
      token: 'essu_kibana-token',
    });

    await expect(systemIdentity.createEphemeralToken()).resolves.toBe('essu_kibana-token');
    expect(uiam.authenticateAsKibana).toHaveBeenCalledTimes(1);
  });

  it('mints a fresh token on every call', async () => {
    uiam.authenticateAsKibana
      .mockResolvedValueOnce({ type: 'project', token: 'essu_first' })
      .mockResolvedValueOnce({ type: 'project', token: 'essu_second' });

    await expect(systemIdentity.createEphemeralToken()).resolves.toBe('essu_first');
    await expect(systemIdentity.createEphemeralToken()).resolves.toBe('essu_second');
    expect(uiam.authenticateAsKibana).toHaveBeenCalledTimes(2);
  });

  it('rejects when UIAM authenticated the caller as something other than a project service account', async () => {
    uiam.authenticateAsKibana.mockResolvedValue({
      type: 'user',
      user_id: '12345',
      token: 'essu_user-token',
    });

    await expect(systemIdentity.createEphemeralToken()).rejects.toThrow(
      'UIAM did not return a properly formatted project service account token for Kibana'
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed validation'));
    for (const call of logger.error.mock.calls) {
      expect(String(call[0])).not.toContain('essu_user-token');
    }
  });

  it('rejects when the response carries no token', async () => {
    uiam.authenticateAsKibana.mockResolvedValue({ type: 'project', project_id: 'project-1' });

    await expect(systemIdentity.createEphemeralToken()).rejects.toThrow(
      'UIAM did not return a properly formatted project service account token for Kibana'
    );
  });

  it('forwards the caller abort signal to UIAM', async () => {
    const controller = new AbortController();

    await systemIdentity.createEphemeralToken(controller.signal);

    expect(uiam.authenticateAsKibana).toHaveBeenCalledWith(controller.signal);
  });

  it('mints without a signal when the caller does not provide one', async () => {
    await systemIdentity.createEphemeralToken();

    expect(uiam.authenticateAsKibana).toHaveBeenCalledWith(undefined);
  });

  it('propagates UIAM failures unchanged', async () => {
    const failure = Boom.unauthorized('client certificate could not be verified');
    uiam.authenticateAsKibana.mockRejectedValue(failure);

    await expect(systemIdentity.createEphemeralToken()).rejects.toBe(failure);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
