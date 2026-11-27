/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createSpacesServiceMock } from '../spaces_service/spaces_service.mock';
import { ExternalSourceSavedObjectService } from './external_source_saved_object_service';
import type { ExternalSourceSavedObjectServiceContract } from './types';

export function createExternalSourceSavedObjectService(): {
  externalSourceSavedObjectService: ExternalSourceSavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const { spacesService } = createSpacesServiceMock();

  return {
    externalSourceSavedObjectService: new ExternalSourceSavedObjectService(
      mockSavedObjectsClient,
      spacesService
    ),
    mockSavedObjectsClient,
  };
}

export type ExternalSourceSavedObjectServiceMock =
  jest.Mocked<ExternalSourceSavedObjectServiceContract>;

export function createExternalSourceSavedObjectServiceMock(): ExternalSourceSavedObjectServiceMock {
  return {
    create: jest.fn().mockResolvedValue({ id: 'external-source-id-default' }),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 'external-source-id-default' }),
    delete: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
  };
}
