/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { schema } from '@kbn/config-schema';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';
import {
  HttpServiceSetup,
  KibanaRequest,
  KibanaResponseFactory,
} from '../../../../../../../src/core/server';

import * as kbnTestServer from '../../../../../../../src/test_utils/kbn_server';
import { KibanaConfig } from '../../../../../../../src/legacy/server/kbn_server';

describe('onRequestInterceptor', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeEach(async () => {
    root = kbnTestServer.createRoot();
  }, 30000);

  afterEach(async () => await root.shutdown());

  function initKbnServer(http: HttpServiceSetup, routes: 'legacy' | 'new-platform') {
    const kbnServer = kbnTestServer.getKbnServer(root);

    if (routes === 'legacy') {
      kbnServer.server.route([
        {
          method: 'GET',
          path: '/foo',
          handler: (req: Legacy.Request, h: Legacy.ResponseToolkit) => {
            return h.response({ path: req.path, basePath: http.basePath.get(req) });
          },
        },
        {
          method: 'GET',
          path: '/some/path/s/foo/bar',
          handler: (req: Legacy.Request, h: Legacy.ResponseToolkit) => {
            return h.response({ path: req.path, basePath: http.basePath.get(req) });
          },
        },
        {
          method: 'GET',
          path: '/i/love/spaces',
          handler: (req: Legacy.Request, h: Legacy.ResponseToolkit) => {
            return h.response({
              path: req.path,
              basePath: http.basePath.get(req),
              query: req.query,
            });
          },
        },
      ]);
    }

    if (routes === 'new-platform') {
      const router = http.createRouter('/');

      router.get(
        { path: '/foo', validate: false },
        (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
          return h.ok({ body: { path: req.url.pathname, basePath: http.basePath.get(req) } });
        }
      );

      router.get(
        { path: '/some/path/s/foo/bar', validate: false },
        (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
          return h.ok({ body: { path: req.url.pathname, basePath: http.basePath.get(req) } });
        }
      );

      router.get(
        {
          path: '/i/love/spaces',
          validate: {
            query: schema.object({
              queryParam: schema.string({
                defaultValue: 'oh noes, this was not set on the request correctly',
              }),
            }),
          },
        },
        (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
          return h.ok({
            body: {
              path: req.url.pathname,
              basePath: http.basePath.get(req),
              query: req.query,
            },
          });
        }
      );
    }
  }

  describe('requests proxied to the legacy platform', () => {
    it('handles paths without a space identifier', async () => {
      const { http } = await root.setup();

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      initKbnServer(http, 'legacy');

      const path = '/foo';

      await kbnTestServer.request.get(root, path).expect(200, {
        path,
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request', async () => {
      const { http } = await root.setup();

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      initKbnServer(http, 'legacy');

      const path = '/s/foo-space/foo';

      const resp = await kbnTestServer.request.get(root, path);

      expect(resp.status).toEqual(200);
      expect(resp.body).toEqual({
        path: '/foo',
        basePath: '/s/foo-space',
      });
    }, 30000);

    it('ignores space identifiers in the middle of the path', async () => {
      const { http } = await root.setup();

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      initKbnServer(http, 'legacy');

      const path = '/some/path/s/foo/bar';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/some/path/s/foo/bar',
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      const { http } = await root.setup();

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      initKbnServer(http, 'legacy');

      const path = '/s/foo/i/love/spaces?queryParam=queryValue';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/i/love/spaces',
        basePath: '/s/foo',
        query: {
          queryParam: 'queryValue',
        },
      });
    }, 30000);
  });

  describe('requests handled completely in the new platform', () => {
    it('handles paths without a space identifier', async () => {
      const { http } = await root.setup();

      initKbnServer(http, 'new-platform');

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      const path = '/foo';

      await kbnTestServer.request.get(root, path).expect(200, {
        path,
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request', async () => {
      const { http } = await root.setup();

      initKbnServer(http, 'new-platform');

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      const path = '/s/foo-space/foo';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/foo',
        basePath: '/s/foo-space',
      });
    }, 30000);

    it('ignores space identifiers in the middle of the path', async () => {
      const { http } = await root.setup();

      initKbnServer(http, 'new-platform');

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      const path = '/some/path/s/foo/bar';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/some/path/s/foo/bar',
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      const { http } = await root.setup();

      initKbnServer(http, 'new-platform');

      const basePath = '/';
      const config = ({
        get: jest.fn().mockReturnValue(basePath),
      } as unknown) as KibanaConfig;

      initSpacesOnRequestInterceptor({ config, http });

      await root.start();

      const path = '/s/foo/i/love/spaces?queryParam=queryValue';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/i/love/spaces',
        basePath: '/s/foo',
        query: {
          queryParam: 'queryValue',
        },
      });
    }, 30000);
  });
});
