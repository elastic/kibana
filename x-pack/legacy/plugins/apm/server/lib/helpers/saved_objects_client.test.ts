/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInternalSavedObjectsClient } from './saved_objects_client';

describe('saved_objects/client', () => {
  describe('getSavedObjectsClient', () => {
    let server: any;
    let savedObjectsClientInstance: any;
    let callWithInternalUser: any;
    let internalRepository: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      callWithInternalUser = jest.fn();
      internalRepository = jest.fn();
      server = {
        savedObjects: {
          SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
          getSavedObjectsRepository: jest.fn(() => internalRepository)
        },
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser }))
          }
        }
      };
    });

    it('should use internal user "admin"', () => {
      getInternalSavedObjectsClient(server);

      expect(server.plugins.elasticsearch.getCluster).toHaveBeenCalledWith(
        'admin'
      );
    });

    it('should call getSavedObjectsRepository with a cluster using the internal user context', () => {
      getInternalSavedObjectsClient(server);

      expect(
        server.savedObjects.getSavedObjectsRepository
      ).toHaveBeenCalledWith(callWithInternalUser);
    });

    it('should return a SavedObjectsClient initialized with the saved objects internal repository', () => {
      const internalSavedObjectsClient = getInternalSavedObjectsClient(server);

      expect(internalSavedObjectsClient).toBe(savedObjectsClientInstance);
      expect(server.savedObjects.SavedObjectsClient).toHaveBeenCalledWith(
        internalRepository
      );
    });
  });
});
