/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CloudConnectClient } from './cloud_connect_client';
import { CLOUD_API_UNREACHABLE } from '../../common/constants';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    create: jest.fn(),
    isAxiosError: actual.isAxiosError,
  };
});

const CLOUD_API_URL = 'https://cloud.elastic.co/api/v1';
const VALIDATE_URL = `${CLOUD_API_URL}/saas/user?show_role_assignments=true`;

const createAxiosError = (overrides: Record<string, unknown>) =>
  Object.assign(new Error((overrides.message as string) ?? 'error'), {
    isAxiosError: true,
    ...overrides,
  });

describe('CloudConnectClient', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockGet: jest.Mock;
  let client: CloudConnectClient;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockGet = jest.fn();
    (axios.create as jest.Mock).mockReturnValue({ get: mockGet });
    client = new CloudConnectClient(logger, CLOUD_API_URL);
  });

  describe('validateApiKeyScope', () => {
    it('reports CLOUD_API_UNREACHABLE when the request gets no response', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({
          code: 'ECONNRESET',
          message:
            'Client network socket disconnected before secure TLS connection was established',
          request: {},
        })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result).toEqual({
        isClusterScoped: false,
        hasValidScope: false,
        errorCode: CLOUD_API_UNREACHABLE,
        errorMessage: `Kibana couldn't reach ${VALIDATE_URL}. Check that outbound HTTPS from the Kibana server to Elastic Cloud isn't blocked by a firewall or proxy.`,
      });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to validate API key scope calling ${VALIDATE_URL} (ECONNRESET: Client network socket disconnected before secure TLS connection was established)`,
        expect.anything()
      );
    });

    it('treats timeouts as unreachable', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({
          code: 'ECONNABORTED',
          message: 'timeout of 30000ms exceeded',
          request: {},
        })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result.errorCode).toBe(CLOUD_API_UNREACHABLE);
    });

    it('does not blame the network for errors raised before the request is sent', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({ code: 'ERR_BAD_REQUEST', message: 'Unsupported protocol ftp:' })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result).toEqual({
        isClusterScoped: false,
        hasValidScope: false,
        errorMessage: 'Unsupported protocol ftp:',
      });
    });

    it('reports a proxy authentication failure (407) as unreachable', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({
          message: 'Request failed with status code 407',
          request: {},
          response: { status: 407 },
        })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result).toEqual({
        isClusterScoped: false,
        hasValidScope: false,
        errorCode: CLOUD_API_UNREACHABLE,
        errorMessage: `A proxy between Kibana and Elastic Cloud rejected the request to ${VALIDATE_URL} (HTTP 407 Proxy Authentication Required). Check the proxy credentials configured for the Kibana server.`,
      });
    });

    it('mentions a possible proxy on 401', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({
          message: 'Request failed with status code 401',
          response: { status: 401 },
        })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBe(
        `The API key was rejected by ${VALIDATE_URL} (HTTP 401). Check that the key is valid and not expired. If it is, a proxy between Kibana and Elastic Cloud may be intercepting the request.`
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('(HTTP 401: Request failed with status code 401)'),
        expect.anything()
      );
    });

    it('keeps the firewall hint on 403', async () => {
      mockGet.mockRejectedValue(
        createAxiosError({
          message: 'Request failed with status code 403',
          response: { status: 403 },
        })
      );

      const result = await client.validateApiKeyScope('some-key');

      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toContain(`Access to ${VALIDATE_URL} was denied (HTTP 403)`);
    });

    it('falls back to the error message for non-axios errors', async () => {
      mockGet.mockRejectedValue(new Error('boom'));

      const result = await client.validateApiKeyScope('some-key');

      expect(result).toEqual({
        isClusterScoped: false,
        hasValidScope: false,
        errorMessage: 'boom',
      });
    });
  });
});
