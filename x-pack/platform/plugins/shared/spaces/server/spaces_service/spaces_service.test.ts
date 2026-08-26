/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { SavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { SpacesService } from './spaces_service';
import { spacesConfig } from '../lib/__fixtures__';
import { SpacesClientService } from '../spaces_client';

const createService = () => {
  const spacesService = new SpacesService();

  const coreStart = coreMock.createStart();

  const respositoryMock = {
    get: jest.fn().mockImplementation((type, id) => {
      if (type === 'space' && id === 'foo') {
        return Promise.resolve({
          id: 'space:foo',
          attributes: {
            name: 'Foo Space',
            disabledFeatures: [],
          },
        });
      }
      if (type === 'space' && id === 'default') {
        return Promise.resolve({
          id: 'space:default',
          attributes: {
            name: 'Default Space',
            disabledFeatures: [],
            _reserved: true,
          },
        });
      }
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }),
  } as unknown as SavedObjectsRepository;

  coreStart.savedObjects.createInternalRepository.mockReturnValue(respositoryMock);
  coreStart.savedObjects.createScopedRepository.mockReturnValue(respositoryMock);

  const spacesServiceSetup = spacesService.setup();

  const spacesClientService = new SpacesClientService(jest.fn(), 'traditional');
  spacesClientService.setup({
    config$: Rx.of(spacesConfig),
  });

  const spacesClientServiceStart = spacesClientService.start(
    coreStart,
    featuresPluginMock.createStart(),
    undefined
  );

  const spacesServiceStart = spacesService.start({
    spacesClientService: spacesClientServiceStart,
  });

  return {
    spacesServiceSetup,
    spacesServiceStart,
  };
};

describe('SpacesService', () => {
  describe('#getSpaceId', () => {
    it('returns the default space id when no spaceId is set on the request', async () => {
      const { spacesServiceStart } = createService();

      const request = httpServerMock.createKibanaRequest();

      expect(spacesServiceStart.getSpaceId(request)).toEqual(DEFAULT_SPACE_ID);
    });

    it('returns the space id from request.spaceId', async () => {
      const { spacesServiceStart } = createService();

      const request = httpServerMock.createKibanaRequest({ spaceId: 'foo' });

      expect(spacesServiceStart.getSpaceId(request)).toEqual('foo');
    });
  });

  describe('#isInDefaultSpace', () => {
    it('returns true when in the default space', async () => {
      const { spacesServiceStart } = createService();

      const request = httpServerMock.createKibanaRequest();

      expect(spacesServiceStart.isInDefaultSpace(request)).toEqual(true);
    });

    it('returns false when not in the default space', async () => {
      const { spacesServiceStart } = createService();

      const request = httpServerMock.createKibanaRequest({ spaceId: 'foo' });

      expect(spacesServiceStart.isInDefaultSpace(request)).toEqual(false);
    });
  });

  describe('#spaceIdToNamespace', () => {
    it('returns the namespace for the given space', async () => {
      const { spacesServiceSetup } = createService();
      expect(spacesServiceSetup.spaceIdToNamespace('foo')).toEqual('foo');
    });
  });

  describe('#namespaceToSpaceId', () => {
    it('returns the space id for the given namespace', async () => {
      const { spacesServiceSetup } = createService();
      expect(spacesServiceSetup.namespaceToSpaceId('foo')).toEqual('foo');
    });
  });

  describe('#getActiveSpace', () => {
    it('returns the default space when in the default space', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest();

      const activeSpace = await spacesServiceStart.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:default',
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      });
    });

    it('returns the space for the current (non-default) space', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest({ spaceId: 'foo' });

      const activeSpace = await spacesServiceStart.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:foo',
        name: 'Foo Space',
        disabledFeatures: [],
      });
    });

    it('propagates errors from the repository', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest({ spaceId: 'unknown-space' });

      await expect(
        spacesServiceStart.getActiveSpace(request)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Saved object [space/unknown-space] not found"`
      );
    });
  });
});
