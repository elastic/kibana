/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';

export const createMockSavedObjectsService = (spaces: any[] = []) => {
  const typeRegistry = savedObjectsTypeRegistryMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsExporter = savedObjectsServiceMock.createExporter();
  const savedObjectsImporter = savedObjectsServiceMock.createImporter();

  savedObjectsClient.get.mockImplementation((type, id) => {
    const result = spaces.filter((s) => s.id === id);
    if (!result.length) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return Promise.resolve(result[0]);
  });
  savedObjectsClient.find.mockResolvedValue({
    page: 1,
    per_page: 20,
    total: spaces.length,
    saved_objects: spaces,
  });
  savedObjectsClient.create.mockImplementation((_type, _attributes, options) => {
    if (spaces.find((s) => s.id === options?.id)) {
      throw SavedObjectsErrorHelpers.decorateConflictError(new Error(), 'space conflict');
    }
    return Promise.resolve({} as SavedObject);
  });
  savedObjectsClient.update.mockImplementation((type, id, _attributes, _options) => {
    if (!spaces.find((s) => s.id === id)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return Promise.resolve({} as SavedObjectsUpdateResponse);
  });

  const { savedObjects } = coreMock.createStart();
  savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);
  savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);
  savedObjects.createExporter.mockReturnValue(savedObjectsExporter);
  savedObjects.createImporter.mockReturnValue(savedObjectsImporter);

  return {
    savedObjects,
    typeRegistry,
    savedObjectsClient,
    savedObjectsExporter,
    savedObjectsImporter,
  };
};
