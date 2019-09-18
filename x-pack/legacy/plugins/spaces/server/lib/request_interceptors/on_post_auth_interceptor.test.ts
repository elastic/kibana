/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { SavedObject, SavedObjectsLegacyService } from 'src/core/server';
import { Feature } from '../../../../../../plugins/features/server';
import { convertSavedObjectToSpace } from '../../routes/lib';
import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';
import { SpacesService } from '../../new_platform/spaces_service';
import { SecurityPlugin } from '../../../../security';
import { SpacesAuditLogger } from '../audit_logger';
import { SpacesServiceSetup } from '../../new_platform/spaces_service/spaces_service';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  httpServerMock,
} from '../../../../../../../src/core/server/mocks';
import * as kbnTestServer from '../../../../../../../src/test_utils/kbn_server';
import { HttpServiceSetup } from 'src/core/server';
import { KibanaConfig, Server } from 'src/legacy/server/kbn_server';
import { XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { parse } from 'url';
import { OptionalPlugin } from '../../../../../server/lib/optional_plugin';

// TODO: re-implement on NP
describe('onPostAuthRequestInterceptor', () => {
  const headers = {
    authorization: 'foo',
  };
  let request: any;
  let spacesService: SpacesServiceSetup;

  const serverBasePath = '/';
  const defaultRoute = '/app/custom-app';

  let root: ReturnType<typeof kbnTestServer.createRoot>;

  function initKbnServer(http: HttpServiceSetup) {
    const kbnServer = kbnTestServer.getKbnServer(root);

    kbnServer.server.route([
      {
        method: 'GET',
        path: '/foo',
        handler: (req: any) => {
          return { path: req.path, basePath: http.basePath.get(req) };
        },
      },
      {
        method: 'GET',
        path: '/app/kibana',
        handler: (req: any) => {
          return { path: req.path, basePath: http.basePath.get(req) };
        },
      },
      {
        method: 'GET',
        path: '/app/app-1',
        handler: (req: any) => {
          return { path: req.path, basePath: http.basePath.get(req) };
        },
      },
      {
        method: 'GET',
        path: '/app/app-2',
        handler: (req: any) => {
          return { path: req.path, basePath: http.basePath.get(req) };
        },
      },
      {
        method: 'GET',
        path: '/api/test/foo',
        handler: (req: any) => {
          return { path: req.path, basePath: http.basePath.get(req) };
        },
      },
    ]);
  }

  beforeEach(() => {
    root = kbnTestServer.createRoot();
    request = async (
      path: string,
      spaces: SavedObject[],
      setupFn: (server: Server) => null = () => null
    ) => {
      const { http } = await root.setup();

      interface Config {
        [key: string]: any;
      }
      const config: Config = {
        'server.basePath': serverBasePath,
        'server.defaultRoute': defaultRoute,
      };

      const configFn = jest.fn(() => {
        return {
          get: jest.fn(key => {
            return config[key];
          }),
        };
      });

      const savedObjectsService = {
        SavedObjectsClient: {
          errors: {
            isNotFoundError: (e: Error) => e.message === 'space not found',
          },
        },
        getSavedObjectsRepository: jest.fn().mockImplementation(() => {
          return {
            get: (type: string, id: string) => {
              if (type === 'space') {
                const space = spaces.find(s => s.id === id);
                if (space) {
                  return space;
                }
                throw new Error('space not found');
              }
            },
            create: () => null,
          };
        }),
      };

      const plugins = {
        elasticsearch: {
          getCluster: jest.fn().mockReturnValue({
            callWithInternalUser: jest.fn(),
            callWithRequest: jest.fn(),
          }),
        },
        spaces: {
          spacesClient: {
            scopedClient: jest.fn(),
          },
        },
        xpack_main: {
          getFeatures: () =>
            [
              {
                id: 'feature-1',
                name: 'feature 1',
                app: ['app-1'],
              },
              {
                id: 'feature-2',
                name: 'feature 2',
                app: ['app-2'],
              },
              {
                id: 'feature-4',
                name: 'feature 4',
                app: ['app-1', 'app-4'],
              },
              {
                id: 'feature-5',
                name: 'feature 4',
                app: ['kibana'],
              },
            ] as Feature[],
        },
      };

      const log = {
        log: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
      };

      let basePath: string | undefined;

      const httpMock = httpServiceMock.createSetupContract();

      httpMock.basePath.get = jest.fn().mockImplementation(() => basePath);
      httpMock.basePath.set = jest.fn().mockImplementation((req: any, newPath: string) => {
        basePath = newPath;
      });
      const preAuthToolkit = httpServiceMock.createOnPreAuthToolkit();
      preAuthToolkit.rewriteUrl.mockImplementation(url => {
        path = url;
        return null as any;
      });
      httpMock.registerOnPreAuth = jest.fn().mockImplementation(async handler => {
        const preAuthRequest = {
          path,
          url: parse(path),
        };
        await handler(
          preAuthRequest,
          httpServerMock.createLifecycleResponseFactory(),
          preAuthToolkit
        );
      });

      const service = new SpacesService(log, configFn().get('server.basePath'));
      spacesService = await service.setup({
        http: httpMock,
        elasticsearch: elasticsearchServiceMock.createSetupContract(),
        savedObjects: (savedObjectsService as unknown) as SavedObjectsLegacyService,
        security: {} as OptionalPlugin<SecurityPlugin>,
        spacesAuditLogger: {} as SpacesAuditLogger,
        config$: Rx.of({ maxSpaces: 1000 }),
      });

      spacesService.scopedClient = jest.fn().mockResolvedValue({
        getAll() {
          return spaces.map(convertSavedObjectToSpace);
        },
        get(spaceId: string) {
          const space = spaces.find(s => s.id === spaceId);
          if (!space) {
            throw new Error('space not found');
          }
          return convertSavedObjectToSpace(space);
        },
      });

      // The onRequest interceptor is also included here because the onPostAuth interceptor requires the onRequest
      // interceptor to parse out the space id and rewrite the request's URL. Rather than duplicating that logic,
      // we are including the already tested interceptor here in the test chain.
      initSpacesOnRequestInterceptor({
        config: (configFn() as unknown) as KibanaConfig,
        http: httpMock,
      });

      await root.start();

      const legacyServer = kbnTestServer.getKbnServer(root).server;

      initSpacesOnPostAuthRequestInterceptor({
        config: (configFn() as unknown) as KibanaConfig,
        onPostAuth: (handler: any) => legacyServer.ext('onPostAuth', handler),
        getHiddenUiAppById: (app: string) => null,
        http: httpMock,
        log,
        xpackMain: plugins.xpack_main as XPackMainPlugin,
        spacesService,
      });

      initKbnServer(http);

      return await kbnTestServer.request.get(root, path);
    };
  }, 30000);

  afterEach(async () => await root.shutdown());

  describe('when accessing an app within a non-existent space', () => {
    it('redirects to the space selector screen', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/s/not-found/app/kibana', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(serverBasePath);
    }, 30000);
  });

  it('when accessing the kibana app it always allows the request to continue', async () => {
    const spaces = [
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
          disabledFeatures: ['feature-1', 'feature-2', 'feature-4', 'feature-5'],
        },
      },
    ];

    const response = await request('/s/a-space/app/kibana', spaces);

    expect(response.statusCode).toEqual(200);
  }, 30000);

  describe('when accessing an API endpoint within a non-existent space', () => {
    it('allows the request to continue', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/s/not-found/api/test/foo', spaces);

      expect(response.statusCode).toEqual(200);
    }, 30000);
  });

  describe.skip('with a single available space', () => {
    test('it redirects to the defaultRoute within the context of the single Space when navigating to Kibana root', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(`${serverBasePath}/s/a-space${defaultRoute}`);

      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('it redirects to the defaultRoute within the context of the Default Space when navigating to Kibana root', async () => {
      // This is very similar to the test above, but this handles the condition where the only available space is the Default Space,
      // which does not have a URL Context. In this scenario, the end result is the same as the other test, but the final URL the user
      // is redirected to does not contain a space identifier (e.g., /s/foo)

      const spaces = [
        {
          id: 'default',
          type: 'space',
          attributes: {
            name: 'Default Space',
          },
        },
      ];

      const response = await request('/', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(`${serverBasePath}${defaultRoute}`);
      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('it allows navigation to apps when none are disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: [] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/kibana', spaces);

      expect(response.statusCode).toEqual(200);

      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('allows navigation to app that is granted by multiple features, when only one of those features is disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: ['feature-1'] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/app-1', spaces);

      expect(response.statusCode).toEqual(200);

      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('does not allow navigation to apps that are only provided by a disabled feature', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: ['feature-2'] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/app-2', spaces);

      expect(response.statusCode).toEqual(404);

      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });
  });

  describe.skip('with multiple available spaces', () => {
    test('it redirects to the Space Selector App when navigating to Kibana root', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
        {
          id: 'b-space',
          type: 'space',
          attributes: {
            name: 'b space',
          },
        },
      ];

      const getHiddenUiAppHandler = jest.fn(() => '<div>space selector</div>');

      const response = await request('/', spaces);

      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('<div>space selector</div>');

      expect(getHiddenUiAppHandler).toHaveBeenCalledTimes(1);
      expect(getHiddenUiAppHandler).toHaveBeenCalledWith('space_selector');
      expect(spacesService.scopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });
  });
});
