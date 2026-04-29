/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import {
  type CSPViolationReport,
  defineRecordViolations,
  type PermissionsPolicyViolationReport,
} from './record_violations';
import type { RouteDefinitionParams } from '..';
import type { SecurityRequestHandlerContext } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';

jest.useFakeTimers().setSystemTime(new Date('2023-10-23'));

function getMockContext(
  licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
) {
  return {
    licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
  } as unknown as SecurityRequestHandlerContext;
}

describe('POST /internal/security/analytics/_record_violations', () => {
  let routeHandler: RequestHandler<any, any, any, any>;
  let routeParamsMock: DeeplyMockedKeys<RouteDefinitionParams>;

  beforeEach(() => {
    routeParamsMock = routeDefinitionParamsMock.create();
    defineRecordViolations(routeParamsMock);

    const [, recordViolationsRouteHandler] = routeParamsMock.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/analytics/_record_violations'
    )!;
    routeHandler = recordViolationsRouteHandler;
  });

  describe('CSP violations', () => {
    const cspViolation: CSPViolationReport = {
      type: 'csp-violation',
      url: 'http://localhost:5601/app/home',
      age: 99,
      user_agent: 'jest',
      body: {
        blockedURL: 'inline',
        disposition: 'report',
        documentURL: 'http://localhost:5601/app/home',
        effectiveDirective: 'style-src-elem',
        originalPolicy: 'style-src none; report-to violations-endpoint',
        statusCode: 200,
      },
    };

    it('reports CSP violation if user is authenticated', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: [cspViolation],
        auth: { isAuthenticated: true },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(routeParamsMock.analyticsService.reportCSPViolation).toHaveBeenCalledWith({
        url: cspViolation.url,
        user_agent: cspViolation.user_agent,
        created: '1698019200099',
        ...cspViolation.body,
      });
    });

    it('does not report CSP violation if user is not authenticated', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: [cspViolation],
        auth: { isAuthenticated: false },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(routeParamsMock.analyticsService.reportCSPViolation).not.toHaveBeenCalled();
    });
  });

  describe('Permissions Policy violations', () => {
    const permissionsPolicyViolation: PermissionsPolicyViolationReport = {
      type: 'permissions-policy-violation',
      url: 'http://localhost:5601/app/home',
      age: 99,
      user_agent: 'jest',
      body: {
        disposition: 'report',
        policyId: 'camera',
      },
    };

    it('reports permissions policy violation if user is authenticated', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: [permissionsPolicyViolation],
        auth: { isAuthenticated: true },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(
        routeParamsMock.analyticsService.reportPermissionsPolicyViolation
      ).toHaveBeenCalledWith({
        url: permissionsPolicyViolation.url,
        user_agent: permissionsPolicyViolation.user_agent,
        created: '1698019200099',
        ...permissionsPolicyViolation.body,
      });
    });

    it('does not report permissions policy violation if user is not authenticated', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: [permissionsPolicyViolation],
        auth: { isAuthenticated: false },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(
        routeParamsMock.analyticsService.reportPermissionsPolicyViolation
      ).not.toHaveBeenCalled();
    });
  });
});
