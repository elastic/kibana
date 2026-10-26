/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { resetSessionApp } from './reset_session_app';

// Mock the dynamic import
const mockRenderResetSessionPage = jest.fn(() => jest.fn());
jest.mock('./reset_session_page', () => ({
  renderResetSessionPage: mockRenderResetSessionPage,
}));

describe('resetSessionApp', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://some-host/security/reset_session',
        search: '',
      },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.search = '';
  });

  describe('application registration', () => {
    it('properly registers application', () => {
      const coreSetupMock = coreMock.createSetup();

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
      expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith(
        '/security/reset_session'
      );

      expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

      const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
      expect(appRegistration).toEqual({
        id: 'security_reset_session',
        title: 'Access Denied',
        chromeless: true,
        appRoute: '/security/reset_session',
        mount: expect.any(Function),
      });
    });
  });

  describe('next URL extraction and logoutUrl construction', () => {
    it('extracts next URL from query parameters and constructs logoutUrl', async () => {
      const basePath = '/mock-base-path';
      const next = '/app/home';
      window.location.search = `?next=${encodeURIComponent(next)}`;

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent(next)}` }
      );
    });

    it('defaults to / when next is not specified', async () => {
      const basePath = '/mock-base-path';
      window.location.search = '';

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent('/')}` }
      );
    });

    it('properly encodes special characters in next parameter', async () => {
      const basePath = '/mock-base-path';
      const next = '/app/kibana?foo=bar&baz=qux#/discover';
      window.location.search = `?next=${encodeURIComponent(next)}`;

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent(next)}` }
      );
    });

    it('handles next parameter with spaces', async () => {
      const basePath = '/mock-base-path';
      const next = '/app/my app';
      window.location.search = `?next=${encodeURIComponent(next)}`;

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent(next)}` }
      );
    });

    it('handles additional query parameters alongside next', async () => {
      const basePath = '/mock-base-path';
      const next = '/app/home';
      window.location.search = `?other=param&next=${encodeURIComponent(next)}&another=value`;

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent(next)}` }
      );
    });

    it('works without basePath', async () => {
      const next = '/app/home';
      window.location.search = `?next=${encodeURIComponent(next)}`;

      const coreSetupMock = coreMock.createSetup();

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `/api/security/logout?next=${encodeURIComponent(next)}` }
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty next parameter', async () => {
      const basePath = '/mock-base-path';
      // Empty next parameter - URLSearchParams.get returns empty string
      window.location.search = '?next=';

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      // Empty string is falsy, so it should default to '/'
      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent('/')}` }
      );
    });

    it('uses first value when multiple next parameters are provided', async () => {
      const basePath = '/mock-base-path';
      const next1 = '/app/first';
      const next2 = '/app/second';
      // URLSearchParams.get returns only the first value
      window.location.search = `?next=${encodeURIComponent(next1)}&next=${encodeURIComponent(
        next2
      )}`;

      const coreSetupMock = coreMock.createSetup({ basePath });

      resetSessionApp.create({
        application: coreSetupMock.application,
        http: coreSetupMock.http,
        getStartServices: coreSetupMock.getStartServices,
      });

      const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
      await mount(coreMock.createAppMountParameters());

      expect(mockRenderResetSessionPage).toHaveBeenCalledTimes(1);
      expect(mockRenderResetSessionPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ element: expect.anything() }),
        { logoutUrl: `${basePath}/api/security/logout?next=${encodeURIComponent(next1)}` }
      );
    });
  });

  describe('unmount behavior', () => {
    it('returns an unmount function', async () => {
      window.location.search = '';

      const coreSetupMock = coreMock.createSetup();

      resetSessionApp.create({
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
