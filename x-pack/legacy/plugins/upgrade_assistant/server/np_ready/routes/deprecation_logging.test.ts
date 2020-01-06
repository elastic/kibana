/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerDeprecationLoggingRoutes } from './deprecation_logging';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_deprecation_logging_apis test.
 */
describe('deprecation logging API', () => {
  let mockRouter: MockRouter;
  let serverShim: any;
  let callWithRequest: any;
  const ctxMock: any = {};

  beforeEach(() => {
    mockRouter = createMockRouter();
    callWithRequest = jest.fn();
    serverShim = {
      router: mockRouter,
      plugins: {
        elasticsearch: {
          getCluster: () => ({ callWithRequest } as any),
        } as any,
      },
    };
    registerDeprecationLoggingRoutes(serverShim);
  });

  describe('GET /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      callWithRequest.mockResolvedValue({ default: { logger: { deprecation: 'WARN' } } });
      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ isEnabled: true });
    });

    it('returns an error if it throws', async () => {
      callWithRequest.mockRejectedValue(new Error(`scary error!`));
      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(500);
    });
  });

  describe('PUT /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      callWithRequest.mockResolvedValue({ default: { logger: { deprecation: 'ERROR' } } });
      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.payload).toEqual({ isEnabled: false });
    });

    it('returns an error if it throws', async () => {
      callWithRequest.mockRejectedValue(new Error(`scary error!`));
      const resp = await serverShim.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(ctxMock, { body: { isEnabled: false } }, kibanaResponseFactory);

      expect(resp.status).toEqual(500);
    });
  });
});
