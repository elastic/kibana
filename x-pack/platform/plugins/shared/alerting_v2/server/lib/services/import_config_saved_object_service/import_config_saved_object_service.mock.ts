/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createSpacesServiceMock } from '../spaces_service/spaces_service.mock';
import { ImportConfigSavedObjectService } from './import_config_saved_object_service';
import type { ImportConfigSavedObjectServiceContract } from './types';

export function createImportConfigSavedObjectService(): {
  importConfigSavedObjectService: ImportConfigSavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const { spacesService } = createSpacesServiceMock();

  return {
    importConfigSavedObjectService: new ImportConfigSavedObjectService(
      mockSavedObjectsClient,
      spacesService
    ),
    mockSavedObjectsClient,
  };
}

export type ImportConfigSavedObjectServiceMock =
  jest.Mocked<ImportConfigSavedObjectServiceContract>;

export function createImportConfigSavedObjectServiceMock(): ImportConfigSavedObjectServiceMock {
  return {
    create: jest.fn().mockResolvedValue({ id: 'import-config-id-default' }),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 'import-config-id-default' }),
    delete: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
  };
}
