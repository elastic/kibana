/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { ECF_LATEST_VERSION_API_PATH } from '../../common/ecf_version_api';
import { ECF_FALLBACK_TEMPLATE_VERSION } from '../../common/ecf_template_version';
import { registerEcfVersionRoute } from './ecf_version';

jest.mock('../services/ecf_version', () => ({
  getLatestEcfVersion: jest.fn(),
}));

import { getLatestEcfVersion } from '../services/ecf_version';
const mockGetLatestEcfVersion = getLatestEcfVersion as jest.MockedFunction<
  typeof getLatestEcfVersion
>;

const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
const mockLogger = loggerMock.create();

describe('registerEcfVersionRoute()', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    registerEcfVersionRoute(router, mockLogger);
  });

  describe('route configuration', () => {
    it('registers a GET route at the expected path', () => {
      const [config] = router.get.mock.calls[0];
      expect(config.path).toBe(ECF_LATEST_VERSION_API_PATH);
    });

    it('marks the route as internal', () => {
      const [config] = router.get.mock.calls[0];
      expect(config.options).toMatchObject({ access: 'internal' });
    });

    it('opts out of authz with a descriptive reason', () => {
      const [config] = router.get.mock.calls[0];
      expect((config as any).security?.authz?.enabled).toBe(false);
      expect((config as any).security?.authz?.reason).toMatch(/CORS/i);
    });
  });

  describe('handler', () => {
    const call = async () => {
      const [, handler] = router.get.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler({} as any, request, response);
      return response;
    };

    it('returns the version and source from the service', async () => {
      mockGetLatestEcfVersion.mockResolvedValue({ version: '1.10.0', source: 'remote' });
      const response = await call();
      expect(response.ok).toHaveBeenCalledWith({
        body: { version: '1.10.0', source: 'remote' },
      });
    });

    it('passes the plugin logger to the service', async () => {
      mockGetLatestEcfVersion.mockResolvedValue({
        version: ECF_FALLBACK_TEMPLATE_VERSION,
        source: 'fallback',
      });
      await call();
      const [loggerArg] = mockGetLatestEcfVersion.mock.calls[0];
      expect(loggerArg).toBe(mockLogger);
    });

    it('returns a fallback response when the service returns a fallback', async () => {
      mockGetLatestEcfVersion.mockResolvedValue({
        version: ECF_FALLBACK_TEMPLATE_VERSION,
        source: 'fallback',
      });
      const response = await call();
      expect(response.ok).toHaveBeenCalledWith({
        body: { version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' },
      });
    });
  });
});
