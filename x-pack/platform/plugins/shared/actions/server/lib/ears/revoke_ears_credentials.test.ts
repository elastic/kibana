/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./request_ears_revoke');

import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { EarsRequestError } from './ears_request_error';
import { requestEarsRevoke } from './request_ears_revoke';
import { revokeEarsCredentials } from './revoke_ears_credentials';

const mockRequestEarsRevoke = requestEarsRevoke as jest.MockedFunction<typeof requestEarsRevoke>;

describe('revokeEarsCredentials', () => {
  const logger = loggerMock.create();
  const configurationUtilities = actionsConfigMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestEarsRevoke.mockResolvedValue({});
  });

  it('revokes the access token (stripped of its token-type prefix) and the refresh token', async () => {
    await revokeEarsCredentials({
      provider: 'google',
      credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
      configurationUtilities,
      logger,
    });

    expect(mockRequestEarsRevoke).toHaveBeenCalledWith(
      'google',
      logger,
      { token: 'access-token-1' },
      configurationUtilities
    );
    expect(mockRequestEarsRevoke).toHaveBeenCalledWith(
      'google',
      logger,
      { token: 'refresh-token-1' },
      configurationUtilities
    );
  });

  it('skips the refresh token when it is not present', async () => {
    await revokeEarsCredentials({
      provider: 'google',
      credentials: { accessToken: 'Bearer access-token-1' },
      configurationUtilities,
      logger,
    });

    expect(mockRequestEarsRevoke).toHaveBeenCalledTimes(1);
    expect(mockRequestEarsRevoke).toHaveBeenCalledWith(
      'google',
      logger,
      { token: 'access-token-1' },
      configurationUtilities
    );
  });

  it('returns the error and the other request id when one revoke call fails', async () => {
    const error = new Error('revoke failed');
    mockRequestEarsRevoke
      .mockResolvedValueOnce({ earsRequestId: 'req-access' })
      .mockRejectedValueOnce(error);

    await expect(
      revokeEarsCredentials({
        provider: 'google',
        credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
        configurationUtilities,
        logger,
      })
    ).resolves.toEqual({ earsRequestIds: ['req-access'], errors: [error] });
  });

  it('keeps the request ids of failed revokes alongside successful ones', async () => {
    const failure = new EarsRequestError({ message: 'x', status: 502, earsRequestId: 'req-502' });
    mockRequestEarsRevoke
      .mockResolvedValueOnce({ earsRequestId: 'req-access' })
      .mockRejectedValueOnce(failure);

    await expect(
      revokeEarsCredentials({
        provider: 'google',
        credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
        configurationUtilities,
        logger,
      })
    ).resolves.toEqual({ earsRequestIds: ['req-access', 'req-502'], errors: [failure] });
  });

  it('returns the EARS request ids of the revoke calls', async () => {
    mockRequestEarsRevoke
      .mockResolvedValueOnce({ earsRequestId: 'req-access' })
      .mockResolvedValueOnce({ earsRequestId: 'req-refresh' });

    await expect(
      revokeEarsCredentials({
        provider: 'google',
        credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
        configurationUtilities,
        logger,
      })
    ).resolves.toEqual({ earsRequestIds: ['req-access', 'req-refresh'], errors: [] });
  });

  it('omits missing request ids', async () => {
    mockRequestEarsRevoke.mockResolvedValueOnce({});

    await expect(
      revokeEarsCredentials({
        provider: 'google',
        credentials: { accessToken: 'Bearer access-token-1' },
        configurationUtilities,
        logger,
      })
    ).resolves.toEqual({ earsRequestIds: [], errors: [] });
  });
});
