/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../ears/get_ears_access_token');
jest.mock('../ears/url');

import type { AxiosInstance } from 'axios';
import type { EarsGetTokenOpts } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getEarsAccessToken } from '../ears/get_ears_access_token';
import { resolveEarsUrl } from '../ears/url';
import { EarsStrategy } from './ears_strategy';
import type { AuthStrategyDeps } from './types';

const mockGetEarsAccessToken = getEarsAccessToken as jest.MockedFunction<typeof getEarsAccessToken>;
const mockResolveEarsUrl = resolveEarsUrl as jest.MockedFunction<typeof resolveEarsUrl>;

const logger = loggerMock.create();
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const baseDeps: AuthStrategyDeps = {
  connectorId: 'connector-1',
  secrets: { provider: 'my-provider' },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const createMockAxiosInstance = () => {
  const mockRequest = jest.fn();
  const instance = {
    interceptors: { response: { use: jest.fn() } },
    request: mockRequest,
  } as unknown as AxiosInstance;
  return { instance, mockRequest };
};

const getOnRejected = (instance: AxiosInstance) => {
  const useMock = instance.interceptors.response.use as jest.Mock;
  expect(useMock).toHaveBeenCalledTimes(1);
  return useMock.mock.calls[0][1] as (error: unknown) => Promise<unknown>;
};

describe('EarsStrategy', () => {
  let strategy: EarsStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new EarsStrategy();
    mockResolveEarsUrl.mockImplementation((url) => `https://ears.example.com${url}`);
  });

  describe('installResponseInterceptor', () => {
    it('passes non-401 errors through unchanged', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 500 },
        message: 'Server Error',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockGetEarsAccessToken).not.toHaveBeenCalled();
    });

    it('does not retry when _retry is already set', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: true, headers: {} },
        response: { status: 401 },
        message: 'Unauthorized',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockGetEarsAccessToken).not.toHaveBeenCalled();
    });

    it('rejects with message when both provider and tokenUrl are absent', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, { ...baseDeps, secrets: {} });
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect((error as { message: string }).message).toContain(
        'Missing required EARS configuration'
      );
      expect(mockGetEarsAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes token on 401 and retries the request', async () => {
      const { instance, mockRequest } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      mockGetEarsAccessToken.mockResolvedValue('Bearer newtoken');
      mockRequest.mockResolvedValue({ status: 200 });

      const error = {
        config: { _retry: false, headers: {} as Record<string, string> },
        response: { status: 401 },
        message: 'Unauthorized',
      };
      await onRejected(error);

      expect(mockGetEarsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ forceRefresh: true, connectorId: 'connector-1' })
      );
      expect(error.config.headers.Authorization).toBe('Bearer newtoken');
      expect(mockRequest).toHaveBeenCalledWith(error.config);
    });

    it('rejects with message when token refresh returns null', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      mockGetEarsAccessToken.mockResolvedValue(null);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect((error as { message: string }).message).toContain(
        'Unable to refresh access token via EARS'
      );
    });

    it('derives token path from provider when provider is present', async () => {
      const { instance, mockRequest } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, {
        ...baseDeps,
        secrets: { provider: 'my-provider' },
      });
      const onRejected = getOnRejected(instance);

      mockGetEarsAccessToken.mockResolvedValue('Bearer token');
      mockRequest.mockResolvedValue({ status: 200 });

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await onRejected(error);

      expect(mockResolveEarsUrl).toHaveBeenCalledWith(
        '/my-provider/oauth/token',
        configurationUtilities.getEarsUrl()
      );
    });

    it('uses tokenUrl directly when provider is absent', async () => {
      const { instance, mockRequest } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, {
        ...baseDeps,
        secrets: { tokenUrl: '/custom/token' },
      });
      const onRejected = getOnRejected(instance);

      mockGetEarsAccessToken.mockResolvedValue('Bearer token');
      mockRequest.mockResolvedValue({ status: 200 });

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await onRejected(error);

      expect(mockResolveEarsUrl).toHaveBeenCalledWith(
        '/custom/token',
        configurationUtilities.getEarsUrl()
      );
    });
  });

  describe('getToken', () => {
    it('throws when connectorTokenClient is absent', async () => {
      const { connectorTokenClient: _ctc, ...depsWithoutClient } = baseDeps;
      await expect(
        strategy.getToken({ kind: 'ears', tokenUrl: '/token' }, depsWithoutClient)
      ).rejects.toThrow('ConnectorTokenClient is required for EARS OAuth flow');
    });

    it('resolves EARS URL and delegates to getEarsAccessToken', async () => {
      mockGetEarsAccessToken.mockResolvedValue('Bearer token');
      mockResolveEarsUrl.mockReturnValue('https://ears.example.com/token');

      const opts: EarsGetTokenOpts = { kind: 'ears', tokenUrl: '/token' };
      await strategy.getToken(opts, baseDeps);

      expect(mockResolveEarsUrl).toHaveBeenCalledWith(
        '/token',
        configurationUtilities.getEarsUrl()
      );
      expect(mockGetEarsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-1',
          tokenUrl: 'https://ears.example.com/token',
          connectorTokenClient,
        })
      );
    });
  });
});
