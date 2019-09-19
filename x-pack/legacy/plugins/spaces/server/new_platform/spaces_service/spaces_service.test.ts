/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { SpacesService } from './spaces_service';
import { coreMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { SpacesAuditLogger } from '../../lib/audit_logger';
import { KibanaRequest, SavedObjectsService } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getSpaceIdFromPath } from '../../lib/spaces_url_parser';
import { createOptionalPlugin } from '../../../../../server/lib/optional_plugin';
import { LegacyAPI } from '../plugin';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
};

const createService = async (serverBasePath: string = '') => {
  const legacyAPI = {
    legacyConfig: {
      serverBasePath,
    },
    savedObjects: ({
      getSavedObjectsRepository: jest.fn().mockReturnValue(null),
    } as unknown) as SavedObjectsService,
  } as LegacyAPI;

  const spacesService = new SpacesService(mockLogger, () => legacyAPI);

  const httpSetup = coreMock.createSetup().http;
  httpSetup.basePath.get = jest.fn().mockImplementation((request: KibanaRequest) => {
    const spaceId = getSpaceIdFromPath(request.url.path);

    if (spaceId !== DEFAULT_SPACE_ID) {
      return `/s/${spaceId}`;
    }
    return '/';
  });

  const uiSettingsService = {
    getDefaults: jest.fn().mockResolvedValue({
      defaultRoute: { value: '/app/mockFallbackRoute' },
    }),
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'defaultRoute') {
        return spaceDefaultRoute;
      }
      throw new Error(`unexpected UI Settings Service call using key ${key}`);
    }),
  };

  const uiSettingsServiceFactory = jest.fn().mockReturnValue(uiSettingsService);

  const savedObjectsService = ({
    getScopedSavedObjectsClient: jest.fn().mockReturnValue(null),
    getSavedObjectsRepository: jest.fn().mockReturnValue(null),
  } as unknown) as SavedObjectsService;

  const spacesServiceSetup = await spacesService.setup({
    http: httpSetup,
    elasticsearch: elasticsearchServiceMock.createSetupContract(),
    config$: Rx.of({ maxSpaces: 10 }),
    uiSettingsServiceFactory,
    security: createOptionalPlugin({ get: () => null }, 'xpack.security', {}, 'security'),
    getSpacesAuditLogger: () => new SpacesAuditLogger({}),
  });

  return {
    spacesServiceSetup,
    uiSettingsServiceFactory,
    savedObjectsService,
  };
};

describe('SpacesService', () => {
  describe('#getSpaceId', () => {
    it('returns the default space id when no identifier is present', async () => {
      const { spacesServiceSetup } = await setup();

      const request: KibanaRequest = {
        url: { path: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual(DEFAULT_SPACE_ID);
    });

    it('returns the space id when identifier is present', async () => {
      const { spacesServiceSetup } = await setup();

      const request: KibanaRequest = {
        url: { path: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual('foo');
    });
  });

  describe('#getBasePath', () => {
    it(`throws when a space id is not provided`, async () => {
      const { spacesServiceSetup } = await setup();

      // @ts-ignore TS knows this isn't right
      expect(() => spacesServiceSetup.getBasePath()).toThrowErrorMatchingInlineSnapshot(
        `"spaceId is required to retrieve base path"`
      );

      expect(() => spacesServiceSetup.getBasePath('')).toThrowErrorMatchingInlineSnapshot(
        `"spaceId is required to retrieve base path"`
      );
    });

    it('returns "" for the default space and no server base path', async () => {
      const { spacesServiceSetup } = await setup();
      expect(spacesServiceSetup.getBasePath(DEFAULT_SPACE_ID)).toEqual('');
    });

    it('returns /sbp for the default space and the "/sbp" server base path', async () => {
      const { spacesServiceSetup } = await setup('/sbp');
      expect(spacesServiceSetup.getBasePath(DEFAULT_SPACE_ID)).toEqual('/sbp');
    });

    it('returns /s/foo for the foo space and no server base path', async () => {
      const { spacesServiceSetup } = await setup();
      expect(spacesServiceSetup.getBasePath('foo')).toEqual('/s/foo');
    });

    it('returns /sbp/s/foo for the foo space and the "/sbp" server base path', async () => {
      const { spacesServiceSetup } = await setup('/sbp');
      expect(spacesServiceSetup.getBasePath('foo')).toEqual('/sbp/s/foo');
    });
  });

  describe('#isInDefaultSpace', () => {
    it('returns true when in the default space', async () => {
      const { spacesServiceSetup } = await setup();

      const request: KibanaRequest = {
        url: { path: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(true);
    });

    it('returns false when not in the default space', async () => {
      const { spacesServiceSetup } = await setup();

      const request: KibanaRequest = {
        url: { path: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(false);
    });
  });

  describe('#getDefaultRoute', () => {
    it('constructs a saved objects client without the spaces wrapper', async () => {
      const { spacesServiceSetup, savedObjectsService } = await setup(
        '/serverBasePath',
        '/app/myDefaultRoute'
      );

      const request: KibanaRequest = {
        url: { path: '/s/foo/app/kibana' },
      } as KibanaRequest;

      await spacesServiceSetup.getDefaultRoute(request);

      expect(savedObjectsService.getScopedSavedObjectsClient).toHaveBeenCalledWith(request, {
        excludedWrappers: ['spaces'],
      });
    });

    describe('with no space id supplied', () => {
      it('returns the route from the advanced setting for the space indicated by the request', async () => {
        const { spacesServiceSetup, uiSettingsServiceFactory } = await setup(
          '/serverBasePath',
          '/app/myDefaultRoute'
        );

        const request: KibanaRequest = {
          url: { path: '/s/foo/app/kibana' },
        } as KibanaRequest;

        await expect(spacesServiceSetup.getDefaultRoute(request)).resolves.toEqual(
          '/app/myDefaultRoute'
        );

        expect(uiSettingsServiceFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'foo',
          })
        );
      });

      it('returns the fallback route when setting is missing for the space indicated by the request', async () => {
        const { spacesServiceSetup, uiSettingsServiceFactory } = await setup('/serverBasePath');

        const request: KibanaRequest = {
          url: { path: '/s/foo/app/kibana' },
        } as KibanaRequest;

        await expect(spacesServiceSetup.getDefaultRoute(request)).resolves.toEqual(
          '/app/mockFallbackRoute'
        );

        expect(uiSettingsServiceFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'foo',
          })
        );
      });

      it('returns the route from the advanced setting for the default space indicated by the request', async () => {
        const { spacesServiceSetup, uiSettingsServiceFactory } = await setup(
          '/serverBasePath',
          '/app/myDefaultRoute'
        );

        const request: KibanaRequest = {
          url: { path: '/app/kibana' },
        } as KibanaRequest;

        await expect(spacesServiceSetup.getDefaultRoute(request)).resolves.toEqual(
          '/app/myDefaultRoute'
        );

        expect(uiSettingsServiceFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: undefined,
          })
        );
      });
    });

    describe('with space id supplied', () => {
      it('returns the route from the advanced setting for the supplied space', async () => {
        const { spacesServiceSetup, uiSettingsServiceFactory } = await setup(
          '/serverBasePath',
          '/app/myDefaultRoute'
        );

        const request: KibanaRequest = {
          url: { path: '/s/foo/app/kibana' },
        } as KibanaRequest;

        await expect(spacesServiceSetup.getDefaultRoute(request, 'bar-space')).resolves.toEqual(
          '/app/myDefaultRoute'
        );

        expect(uiSettingsServiceFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'bar-space',
          })
        );
      });

      it('returns the fallback route for the supplied space', async () => {
        const { spacesServiceSetup, uiSettingsServiceFactory } = await setup('/serverBasePath');

        const request: KibanaRequest = {
          url: { path: '/s/foo/app/kibana' },
        } as KibanaRequest;

        await expect(spacesServiceSetup.getDefaultRoute(request, 'bar-space')).resolves.toEqual(
          '/app/mockFallbackRoute'
        );

        expect(uiSettingsServiceFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'bar-space',
          })
        );
      });
    });
  });

  describe('#spaceIdToNamespace', () => {
    it('returns the namespace for the given space', async () => {
      const { spacesServiceSetup } = await setup();
      expect(spacesServiceSetup.spaceIdToNamespace('foo')).toEqual('foo');
    });
  });

  describe('#namespaceToSpaceId', () => {
    it('returns the space id for the given namespace', async () => {
      const { spacesServiceSetup } = await setup();
      expect(spacesServiceSetup.namespaceToSpaceId('foo')).toEqual('foo');
    });
  });
});
