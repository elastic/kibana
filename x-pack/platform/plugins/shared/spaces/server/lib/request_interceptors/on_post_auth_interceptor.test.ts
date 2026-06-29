/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { OnPostAuthHandler } from '@kbn/core-http-server';
import { addSpaceIdToPath, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import type { Space } from '../../../common';
import { ENTER_SPACE_PATH } from '../../../common/constants';
import { getSpaceSelectorUrl } from '../get_space_selector_url';

const serverBasePath = '';
const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

const space = (id: string, overrides: Partial<Space> = {}): Space => ({
  id,
  name: id,
  disabledFeatures: [],
  ...overrides,
});

describe('initSpacesOnPostAuthRequestInterceptor', () => {
  let postAuthHandler: OnPostAuthHandler;
  let getSpacesService: jest.Mock;
  let getCurrent: jest.Mock;
  let update: jest.Mock;
  let getAll: jest.Mock;
  let getSpaceId: jest.Mock;
  let response: ReturnType<typeof httpServerMock.createLifecycleResponseFactory>;
  let toolkit: ReturnType<typeof httpServiceMock.createOnPostAuthToolkit>;

  const setup = () => {
    getCurrent = jest.fn();
    update = jest.fn().mockResolvedValue(undefined);
    getAll = jest.fn();
    getSpaceId = jest.fn();

    const coreStart = coreMock.createStart();
    coreStart.userProfile = {
      getCurrent,
      bulkGet: jest.fn(),
      suggest: jest.fn(),
      update,
    } as typeof coreStart.userProfile;

    const coreSetup = coreMock.createSetup();
    coreSetup.http.registerOnPostAuth.mockImplementation((fn: OnPostAuthHandler) => {
      postAuthHandler = fn;
    });
    coreSetup.http.basePath = {
      serverBasePath,
    } as typeof coreSetup.http.basePath;
    coreSetup.getStartServices.mockResolvedValue([
      coreStart,
      { features: featuresPluginMock.createStart() },
      {},
    ]);

    getSpacesService = jest.fn().mockReturnValue({
      getSpaceId,
      createSpacesClient: jest.fn().mockReturnValue({
        getAll,
        get: jest.fn(),
      }),
    });

    initSpacesOnPostAuthRequestInterceptor({
      http: coreSetup.http,
      getCoreStartServices: coreSetup.getStartServices,
      getSpacesService,
      log: loggingSystemMock.createLogger(),
    });

    response = httpServerMock.createLifecycleResponseFactory();
    toolkit = httpServiceMock.createOnPostAuthToolkit();
    response.redirected.mockReturnValue({ statusCode: 302 } as any);
    response.customError.mockReturnValue({ statusCode: 500 } as any);
    toolkit.next.mockReturnValue(undefined as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  describe('GET / (kibana root)', () => {
    it('redirects to last selected space when user explicitly opts in and space is accessible', async () => {
      getSpaceId.mockReturnValue(DEFAULT_SPACE_ID);
      getAll.mockResolvedValue([space('default'), space('foo')]);
      getCurrent.mockResolvedValue({
        data: {
          userSettings: {
            rememberSelectedSpace: true,
            lastSelectedSpaceId: 'foo',
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: '/',
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);

      expect(response.redirected).toHaveBeenCalledWith({
        headers: {
          location: addSpaceIdToPath(serverBasePath, 'foo', ENTER_SPACE_PATH),
        },
      });
      expect(response.redirected).toHaveBeenCalledTimes(1);
    });

    it('redirects to space selector when last space is not accessible', async () => {
      getSpaceId.mockReturnValue(DEFAULT_SPACE_ID);
      getAll.mockResolvedValue([space('default'), space('bar')]);
      getCurrent.mockResolvedValue({
        data: {
          userSettings: {
            rememberSelectedSpace: true,
            lastSelectedSpaceId: 'missing',
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: '/',
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);

      expect(response.redirected).toHaveBeenCalledWith({
        headers: { location: getSpaceSelectorUrl(serverBasePath) },
      });
    });

    it('redirects to space selector when rememberSelectedSpace is off', async () => {
      getSpaceId.mockReturnValue(DEFAULT_SPACE_ID);
      getAll.mockResolvedValue([space('default'), space('foo')]);
      getCurrent.mockResolvedValue({
        data: {
          userSettings: {
            rememberSelectedSpace: false,
            lastSelectedSpaceId: 'foo',
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: '/',
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);

      expect(response.redirected).toHaveBeenCalledWith({
        headers: { location: getSpaceSelectorUrl(serverBasePath) },
      });
    });

    it('redirects single available space before reading last-space preference', async () => {
      getSpaceId.mockReturnValue(DEFAULT_SPACE_ID);
      getAll.mockResolvedValue([space('only')]);

      const request = httpServerMock.createKibanaRequest({
        path: '/',
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);

      expect(getCurrent).not.toHaveBeenCalled();
      expect(response.redirected).toHaveBeenCalledWith({
        headers: {
          location: addSpaceIdToPath(serverBasePath, 'only', ENTER_SPACE_PATH),
        },
      });
    });

    it('skips last-space redirect when unauthenticated', async () => {
      getSpaceId.mockReturnValue(DEFAULT_SPACE_ID);
      getAll.mockResolvedValue([space('default'), space('foo')]);

      const request = httpServerMock.createKibanaRequest({
        path: '/',
        auth: { isAuthenticated: false },
      });

      await postAuthHandler(request, response, toolkit);

      expect(getCurrent).not.toHaveBeenCalled();
      expect(response.redirected).toHaveBeenCalledWith({
        headers: { location: getSpaceSelectorUrl(serverBasePath) },
      });
    });
  });

  describe('GET /spaces/enter', () => {
    it('updates lastSelectedSpaceId when user opted in', async () => {
      getSpaceId.mockReturnValue('foo');
      getCurrent.mockResolvedValue({
        uid: 'uid-1',
        data: {
          userSettings: {
            rememberSelectedSpace: true,
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: ENTER_SPACE_PATH,
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);
      await flushMicrotasks();

      expect(update).toHaveBeenCalledWith('uid-1', {
        userSettings: { lastSelectedSpaceId: 'foo' },
      });
      expect(toolkit.next).toHaveBeenCalled();
    });

    it('clears lastSelectedSpaceId when rememberSelectedSpace is false and a value was stored', async () => {
      getSpaceId.mockReturnValue('foo');
      getCurrent.mockResolvedValue({
        uid: 'uid-1',
        data: {
          userSettings: {
            rememberSelectedSpace: false,
            lastSelectedSpaceId: 'bar',
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: ENTER_SPACE_PATH,
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);
      await flushMicrotasks();

      expect(update).toHaveBeenCalledWith('uid-1', {
        userSettings: { lastSelectedSpaceId: null },
      });
      expect(toolkit.next).toHaveBeenCalled();
    });

    it('clears lastSelectedSpaceId when rememberSelectedSpace is false and lastSelectedSpaceId is undefined', async () => {
      getSpaceId.mockReturnValue('foo');
      getCurrent.mockResolvedValue({
        uid: 'uid-1',
        data: {
          userSettings: {
            rememberSelectedSpace: false,
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: ENTER_SPACE_PATH,
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);
      await flushMicrotasks();

      expect(update).toHaveBeenCalledWith('uid-1', {
        userSettings: { lastSelectedSpaceId: null },
      });
      expect(toolkit.next).toHaveBeenCalled();
    });

    it('does not update profile when rememberSelectedSpace is false and lastSelectedSpaceId is already null', async () => {
      getSpaceId.mockReturnValue('foo');
      getCurrent.mockResolvedValue({
        uid: 'uid-1',
        data: {
          userSettings: {
            rememberSelectedSpace: false,
            lastSelectedSpaceId: null,
          },
        },
      });

      const request = httpServerMock.createKibanaRequest({
        path: ENTER_SPACE_PATH,
        auth: { isAuthenticated: true },
      });

      await postAuthHandler(request, response, toolkit);
      await flushMicrotasks();

      expect(update).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalled();
    });

    it('does not update profile when unauthenticated', async () => {
      getSpaceId.mockReturnValue('foo');

      const request = httpServerMock.createKibanaRequest({
        path: ENTER_SPACE_PATH,
        auth: { isAuthenticated: false },
      });

      await postAuthHandler(request, response, toolkit);
      await flushMicrotasks();

      expect(getCurrent).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });
  });
});
