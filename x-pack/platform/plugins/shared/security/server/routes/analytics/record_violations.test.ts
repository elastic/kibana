/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import {
  type CSPViolationReport,
  defineRecordViolations,
  type PermissionsPolicyViolationReport,
} from './record_violations';
import type { RouteDefinitionParams } from '..';
import type { AnalyticsServiceSetupParams } from '../../analytics/analytics_service';
import { AnalyticsService } from '../../analytics/analytics_service';
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

    it('reports CSP violation with null optional fields, stripping the null values', async () => {
      const cspViolationWithNulls: CSPViolationReport = {
        type: 'csp-violation',
        url: 'http://localhost:5601/app/home',
        age: null,
        user_agent: null,
        body: {
          blockedURL: null,
          disposition: 'report',
          documentURL: 'http://localhost:5601/app/home',
          effectiveDirective: 'script-src-elem',
          originalPolicy: 'script-src none; report-to violations-endpoint',
          sample: null,
          referrer: null,
          sourceFile: null,
          statusCode: 200,
          lineNumber: null,
          columnNumber: null,
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: [cspViolationWithNulls],
        headers: { 'user-agent': 'Mozilla/5.0' },
        auth: { isAuthenticated: true },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      // `null` values are dropped: only the fields the browser actually populated are forwarded.
      // A `null` `user_agent` falls back to the request's User-Agent header (browsers always send
      // one), so it is never forwarded as `null`.
      expect(routeParamsMock.analyticsService.reportCSPViolation).toHaveBeenCalledWith({
        url: cspViolationWithNulls.url,
        user_agent: 'Mozilla/5.0',
        created: '1698019200000',
        disposition: 'report',
        documentURL: 'http://localhost:5601/app/home',
        effectiveDirective: 'script-src-elem',
        originalPolicy: 'script-src none; report-to violations-endpoint',
        statusCode: 200,
      });
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

    it('reports permissions policy violation with null optional fields, stripping the null values', async () => {
      const permissionsPolicyViolationWithNulls: PermissionsPolicyViolationReport = {
        type: 'permissions-policy-violation',
        url: 'http://localhost:5601/app/home',
        age: null,
        user_agent: null,
        body: {
          disposition: 'enforce',
          policyId: null,
          featureId: null,
          sourceFile: null,
          lineNumber: null,
          columnNumber: null,
          allowAttribute: null,
          srcAttribute: null,
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: [permissionsPolicyViolationWithNulls],
        headers: { 'user-agent': 'Mozilla/5.0' },
        auth: { isAuthenticated: true },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      // `null` values are dropped: only the fields the browser actually populated are forwarded.
      // A `null` `user_agent` falls back to the request's User-Agent header (browsers always send
      // one), so it is never forwarded as `null`.
      expect(
        routeParamsMock.analyticsService.reportPermissionsPolicyViolation
      ).toHaveBeenCalledWith({
        url: permissionsPolicyViolationWithNulls.url,
        user_agent: 'Mozilla/5.0',
        created: '1698019200000',
        disposition: 'enforce',
      });
    });

    it('reports permissions policy violation with iframe attribution fields', async () => {
      const iframeViolation: PermissionsPolicyViolationReport = {
        type: 'permissions-policy-violation',
        url: 'http://localhost:5601/app/home',
        age: 99,
        user_agent: 'jest',
        body: {
          disposition: 'enforce',
          featureId: 'camera',
          allowAttribute: 'camera *',
          srcAttribute: 'http://localhost:5601/embedded',
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: [iframeViolation],
        auth: { isAuthenticated: true },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(
        routeParamsMock.analyticsService.reportPermissionsPolicyViolation
      ).toHaveBeenCalledWith({
        url: iframeViolation.url,
        user_agent: iframeViolation.user_agent,
        created: '1698019200099',
        ...iframeViolation.body,
      });
    });
  });

  // The tests above assert against a mocked analytics service. Event-based telemetry validates each
  // event against its registered schema (in dev mode only), and that schema has no notion of a
  // nullable field, so a `null` value forwarded to it would throw. These tests wire the route to a
  // real analytics client in dev mode to prove the violations we accept are actually reportable —
  // i.e. that the null-stripping keeps the payload schema-valid end-to-end.
  describe('end-to-end reporting with dev-mode schema validation', () => {
    let routeHandlerWithRealAnalytics: RequestHandler<any, any, any, any>;

    beforeEach(() => {
      const logger = loggingSystemMock.createLogger();
      const analyticsClient = createAnalytics({ isDev: true, logger });
      const analyticsService = new AnalyticsService(logger).setup({
        analytics: analyticsClient as unknown as AnalyticsServiceSetupParams['analytics'],
      });

      const routeParams = routeDefinitionParamsMock.create();
      routeParams.analyticsService = analyticsService as typeof routeParams.analyticsService;
      defineRecordViolations(routeParams);

      const [, handler] = routeParams.router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/analytics/_record_violations'
      )!;
      routeHandlerWithRealAnalytics = handler;
    });

    it('records a CSP violation whose optional fields are all null', async () => {
      const cspViolationWithNulls: CSPViolationReport = {
        type: 'csp-violation',
        url: 'http://localhost:5601/app/home',
        age: null,
        user_agent: null,
        body: {
          blockedURL: null,
          disposition: 'report',
          documentURL: 'http://localhost:5601/app/home',
          effectiveDirective: 'script-src-elem',
          originalPolicy: 'script-src none; report-to violations-endpoint',
          sample: null,
          referrer: null,
          sourceFile: null,
          statusCode: 200,
          lineNumber: null,
          columnNumber: null,
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: [cspViolationWithNulls],
        auth: { isAuthenticated: true },
      });

      // A throw here would mean the produced event failed EBT schema validation.
      const response = await routeHandlerWithRealAnalytics(
        getMockContext(),
        request,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
    });

    it('records a Permissions-Policy violation whose optional fields are all null', async () => {
      const permissionsPolicyViolationWithNulls: PermissionsPolicyViolationReport = {
        type: 'permissions-policy-violation',
        url: 'http://localhost:5601/app/home',
        age: null,
        user_agent: null,
        body: {
          disposition: 'enforce',
          policyId: null,
          featureId: null,
          sourceFile: null,
          lineNumber: null,
          columnNumber: null,
          allowAttribute: null,
          srcAttribute: null,
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: [permissionsPolicyViolationWithNulls],
        auth: { isAuthenticated: true },
      });

      const response = await routeHandlerWithRealAnalytics(
        getMockContext(),
        request,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
    });
  });
});
