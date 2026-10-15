/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios');
jest.mock('../axios_utils');
jest.mock('./url');

import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { SSLSettings } from '@kbn/actions-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { request } from '../axios_utils';
import { getEarsEndpointsForProvider, resolveEarsUrl } from './url';
import { requestEarsRevoke } from './request_ears_revoke';

const mockRequest = request as jest.MockedFunction<typeof request>;
const mockGetEarsEndpointsForProvider = getEarsEndpointsForProvider as jest.MockedFunction<
  typeof getEarsEndpointsForProvider
>;
const mockResolveEarsUrl = resolveEarsUrl as jest.MockedFunction<typeof resolveEarsUrl>;

const REVOKE_URL = 'https://ears.example.com/v1/my-provider/oauth/revoke';

describe('requestEarsRevoke', () => {
  const logger = loggerMock.create();
  const configurationUtilities = actionsConfigMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({});
    mockGetEarsEndpointsForProvider.mockReturnValue({
      authorizeEndpoint: 'v1/my-provider/oauth/authorize',
      tokenEndpoint: 'v1/my-provider/oauth/token',
      refreshEndpoint: 'v1/my-provider/oauth/refresh',
      revokeEndpoint: 'v1/my-provider/oauth/revoke',
    });
    mockResolveEarsUrl.mockReturnValue(REVOKE_URL);
    mockRequest.mockResolvedValue({
      status: 200,
      data: {},
    } as unknown as AxiosResponse);
  });

  it('sends the token to the resolved revoke URL', async () => {
    await requestEarsRevoke('my-provider', logger, { token: 'some-token' }, configurationUtilities);

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: REVOKE_URL,
        method: 'post',
        data: { token: 'some-token' },
      })
    );
  });

  it('passes sslOverrides from getEARSSSLSettings to the request call', async () => {
    const sslSettings: SSLSettings = { verificationMode: 'full', cert: Buffer.from('cert') };
    configurationUtilities.getEARSSSLSettings.mockReturnValue(sslSettings);

    await requestEarsRevoke('my-provider', logger, { token: 'some-token' }, configurationUtilities);

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sslOverrides: sslSettings })
    );
  });

  it('rejects with a catchable error (does not crash) when the configured EARS ssl files cannot be read', async () => {
    configurationUtilities.getEARSSSLSettings.mockImplementationOnce(() => {
      throw new Error("ENOENT: no such file or directory, open '/bad/cert.pem'");
    });

    await expect(
      requestEarsRevoke('my-provider', logger, { token: 'some-token' }, configurationUtilities)
    ).rejects.toThrow("ENOENT: no such file or directory, open '/bad/cert.pem'");

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('resolves without error on a 200 response', async () => {
    await expect(
      requestEarsRevoke('my-provider', logger, { token: 'some-token' }, configurationUtilities)
    ).resolves.toBeUndefined();
  });

  it('throws when the EARS revoke endpoint returns a non-200 status', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 400,
      data: { error: 'invalid_token' },
    } as unknown as AxiosResponse);

    await expect(
      requestEarsRevoke('my-provider', logger, { token: 'bad-token' }, configurationUtilities)
    ).rejects.toThrow('Failed to revoke token via auth redirect service');
  });
});
