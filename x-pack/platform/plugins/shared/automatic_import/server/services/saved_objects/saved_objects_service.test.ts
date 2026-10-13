/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObject, SavedObjectsClient } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AutomaticImportSavedObjectService } from './saved_objects_service';
import { INTEGRATION_SAVED_OBJECT_TYPE } from './constants';
import type { IntegrationAttributes } from './schemas/types';

const integration = (integrationId: string, title: string) =>
  ({
    id: integrationId,
    type: INTEGRATION_SAVED_OBJECT_TYPE,
    references: [],
    attributes: {
      integration_id: integrationId,
      created_by: 'elastic',
      metadata: { title, description: `${title} description` },
    },
  } as SavedObject<IntegrationAttributes>);

describe('AutomaticImportSavedObjectService', () => {
  let clientMock: ReturnType<typeof savedObjectsClientMock.create>;
  let service: AutomaticImportSavedObjectService;

  /**
   * Replaces the point-in-time finder with one that yields the given pages, so a
   * multi-page sweep can be exercised without producing a full 1000-item page.
   */
  const givenFinderPages = (pages: Array<Array<SavedObject<IntegrationAttributes>>>) => {
    const close = jest.fn().mockResolvedValue(undefined);
    const finder = {
      find: async function* find() {
        for (const savedObjects of pages) {
          yield { saved_objects: savedObjects };
        }
      },
      close,
    };
    clientMock.createPointInTimeFinder.mockReturnValue(
      finder as unknown as ReturnType<SavedObjectsClient['createPointInTimeFinder']>
    );
    return { close };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock = savedObjectsClientMock.create();
    service = new AutomaticImportSavedObjectService(
      loggerMock.create(),
      clientMock as unknown as SavedObjectsClient
    );
  });

  describe('getAllIntegrationNames', () => {
    it('returns the id and title of every integration across finder pages', async () => {
      givenFinderPages([
        [integration('nginx', 'Nginx'), integration('apache', 'Apache HTTP')],
        [integration('mako', 'Mako')],
      ]);

      await expect(service.getAllIntegrationNames()).resolves.toEqual([
        { integrationId: 'nginx', title: 'Nginx' },
        { integrationId: 'apache', title: 'Apache HTTP' },
        { integrationId: 'mako', title: 'Mako' },
      ]);
    });

    it('projects away everything but the id and title so logos are never fetched', async () => {
      givenFinderPages([]);

      await service.getAllIntegrationNames();

      expect(clientMock.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          fields: ['integration_id', 'metadata.title'],
        })
      );
    });

    it('returns an empty array when no integrations exist', async () => {
      givenFinderPages([]);

      await expect(service.getAllIntegrationNames()).resolves.toEqual([]);
    });

    it('closes the finder once the sweep completes', async () => {
      const { close } = givenFinderPages([[integration('nginx', 'Nginx')]]);

      await service.getAllIntegrationNames();

      expect(close).toHaveBeenCalled();
    });

    it('closes the finder when the sweep throws', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      clientMock.createPointInTimeFinder.mockReturnValue({
        find: () => ({
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(new Error('search failed')),
          }),
        }),
        close,
      } as unknown as ReturnType<SavedObjectsClient['createPointInTimeFinder']>);

      await expect(service.getAllIntegrationNames()).rejects.toThrow('search failed');
      expect(close).toHaveBeenCalled();
    });

    it('rethrows a Saved Objects 404 from the finder so a missing PIT does not look like an empty catalog', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      clientMock.createPointInTimeFinder.mockReturnValue({
        find: () => ({
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(SavedObjectsErrorHelpers.createGenericNotFoundError()),
          }),
        }),
        close,
      } as unknown as ReturnType<SavedObjectsClient['createPointInTimeFinder']>);

      await expect(service.getAllIntegrationNames()).rejects.toThrow('Not Found');
      expect(close).toHaveBeenCalled();
    });

    it('rethrows a Saved Objects 404 from close()', async () => {
      const close = jest
        .fn()
        .mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
      clientMock.createPointInTimeFinder.mockReturnValue({
        find: async function* find() {
          yield { saved_objects: [integration('nginx', 'Nginx')] };
        },
        close,
      } as unknown as ReturnType<SavedObjectsClient['createPointInTimeFinder']>);

      await expect(service.getAllIntegrationNames()).rejects.toThrow('Not Found');
    });
  });
});
