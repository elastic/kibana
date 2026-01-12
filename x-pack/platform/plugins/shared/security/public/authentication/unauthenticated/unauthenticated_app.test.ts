/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { unauthenticatedApp } from './unauthenticated_app';

// Mock the dynamic import
const mockRenderUnauthenticatedPage = jest.fn(() => jest.fn());
jest.mock('./unauthenticated_page', () => ({
  renderUnauthenticatedPage: mockRenderUnauthenticatedPage,
}));

describe('unauthenticatedApp', () => {
  const originalWindowLocation = window.location;

  beforeAll(() => {
    // @ts-expect-error - We need to override window.location for testing
    delete window.location;
    // @ts-expect-error - Creating a partial Location mock for testing
    window.location = {
      href: 'https://some-host/security/unauthenticated',
    };
  });

  afterAll(() => {
    // @ts-expect-error - Restoring window.location after testing
    window.location = originalWindowLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('application registration', () => {
    it('properly registers application', () => {
      const coreSetupMock = coreMock.createSetup();

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
      expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith(
        '/security/unauthenticated'
      );

      expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

      const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
      expect(appRegistration).toEqual({
        id: 'security_unauthenticated',
        title: 'Authentication Error',
        chromeless: true,
        appRoute: '/security/unauthenticated',
        mount: expect.any(Function),
      });
    });
  });

  describe('next URL extraction', () => {
    it('extracts next URL from query parameters', async () => {
      const basePath = '/mock-base-path';
      const next = `${basePath}/app/home`;
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        next
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: next }
      );
    });

    it('extracts next URL with hash fragment', async () => {
      const basePath = '/mock-base-path';
      const next = `${basePath}/app/kibana`;
      const hash = '/discover/New-Saved-Search';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        next
      )}#${hash}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${next}#${hash}` }
      );
    });

    it('returns basePath with trailing slash when next is not specified', async () => {
      const basePath = '/mock-base-path';
      window.location.href = `https://host.com${basePath}/security/unauthenticated`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('handles multiple next query parameters and uses the first one', async () => {
      const basePath = '/mock-base-path';
      const next1 = `${basePath}/app/kibana`;
      const next2 = `${basePath}/app/ml`;
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        next1
      )}&next=${encodeURIComponent(next2)}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: next1 }
      );
    });

    it('properly decodes URL-encoded next parameter', async () => {
      const basePath = '/mock-base-path';
      const next = `${basePath}/app/kibana`;
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        basePath
      )}%2Fapp%2Fkibana`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: next }
      );
    });
  });

  describe('open redirect protection', () => {
    it('prevents redirect to external host with protocol', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = 'https://evil.com/app/kibana';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect to external host via encoded URL', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = `${encodeURIComponent('http://evil.com')}%2Fapp%2Fkibana`;
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${maliciousUrl}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect via protocol-relative URL (double slash)', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = '//evil.com';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect via triple slash URL', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = '///evil.com';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect to different port', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = 'http://localhost:9999/app/kibana';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect outside of basePath', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = '/different-base-path/app/kibana';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect via javascript: protocol', async () => {
      const basePath = '/mock-base-path';
      // eslint-disable-next-line no-script-url
      const maliciousUrl = 'javascript:alert(1)';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect via data: protocol', async () => {
      const basePath = '/mock-base-path';
      const maliciousUrl = 'data:text/html,<script>alert(1)</script>';
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ instead of the malicious URL
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });

    it('prevents redirect via path traversal attempt', async () => {
      const basePath = '/mock-base-path';
      // Attempt to escape basePath using path traversal
      const maliciousUrl = `${basePath}/../../../etc/passwd`;
      window.location.href = `https://host.com${basePath}/security/unauthenticated?next=${encodeURIComponent(
        maliciousUrl
      )}`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Should fall back to basePath/ since the normalized path escapes basePath
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledTimes(1);
      expect(mockRenderUnauthenticatedPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { loginUrl: `${basePath}/` }
      );
    });
  });

  describe('unmount behavior', () => {
    it('returns an unmount function', async () => {
      const basePath = '/mock-base-path';
      window.location.href = `https://host.com${basePath}/security/unauthenticated`;

      const coreSetupMock = coreMock.createSetup();
      (coreSetupMock.http.basePath.serverBasePath as string) = basePath;

      unauthenticatedApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      const unmount = await mount(coreMock.createAppMountParameters());

      expect(typeof unmount).toBe('function');
    });
  });
});
