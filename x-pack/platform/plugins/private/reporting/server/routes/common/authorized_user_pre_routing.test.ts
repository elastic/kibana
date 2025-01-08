/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ReportingCore } from '../..';
import { ReportingInternalSetup, ReportingInternalStart } from '../../core';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../types';
import { authorizedUserPreRouting } from './authorized_user_pre_routing';

let mockCore: ReportingCore;
let mockSetupDeps: ReportingInternalSetup;
let mockStartDeps: ReportingInternalStart;

const mockReportingConfig = createMockConfigSchema();

const getMockContext = () =>
  ({
    core: coreMock.createRequestHandlerContext(),
  } as unknown as ReportingRequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', search: '', pathname: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest);

const getMockResponseFactory = () =>
  ({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
  } as unknown as KibanaResponseFactory);

describe('authorized_user_pre_routing', function () {
  beforeEach(async () => {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true } },
    });

    mockStartDeps = await createMockPluginStart(
      {
        securityService: {
          authc: {
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
        },
      },
      mockReportingConfig
    );
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
  });

  it('should return from handler with a "false" user when security plugin is not found', async function () {
    mockSetupDeps = createMockPluginSetup({ security: undefined });
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    await authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return from handler with a "false" user when security is disabled', async function () {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => false } }, // disable security
    });
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    await authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return with 401 when security is enabled and the request is unauthenticated', async function () {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true } },
    });
    mockStartDeps = await createMockPluginStart(
      { securityService: { authc: { getCurrentUser: () => null } } },
      mockReportingConfig
    );
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockHandler = () => {
      throw new Error('Handler callback should not be called');
    };
    const requestHandler = authorizedUserPreRouting(mockCore, mockHandler);

    await expect(
      requestHandler(getMockContext(), getMockRequest(), getMockResponseFactory())
    ).resolves.toMatchObject({
      body: `Sorry, you aren't authenticated`,
    });
  });
});
