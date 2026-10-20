/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./request_ears_revoke');

import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { requestEarsRevoke } from './request_ears_revoke';
import { revokeEarsCredentials } from './revoke_ears_credentials';

const mockRequestEarsRevoke = requestEarsRevoke as jest.MockedFunction<typeof requestEarsRevoke>;

describe('revokeEarsCredentials', () => {
  const logger = loggerMock.create();
  const configurationUtilities = actionsConfigMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestEarsRevoke.mockResolvedValue(undefined);
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

  it('throws when a revoke call fails', async () => {
    mockRequestEarsRevoke.mockRejectedValueOnce(new Error('revoke failed'));

    await expect(
      revokeEarsCredentials({
        provider: 'google',
        credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
        configurationUtilities,
        logger,
      })
    ).rejects.toThrow('revoke failed');
  });
});
