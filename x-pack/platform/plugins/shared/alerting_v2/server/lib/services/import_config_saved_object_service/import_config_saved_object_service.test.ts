/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { ImportConfigSavedObjectService } from './import_config_saved_object_service';
import { createImportConfigSavedObjectService } from './import_config_saved_object_service.mock';

const mockAttrs: ImportConfigSavedObjectAttributes = {
  name: 'Datadog',
  kind: 'custom',
  enabled: true,
  source: 'datadog',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: [],
  routing_tags: [],
  created_by: { profile_uid: 'elastic' },
  updated_by: { profile_uid: 'elastic' },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('ImportConfigSavedObjectService', () => {
  let service: ImportConfigSavedObjectService;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    const mocks = createImportConfigSavedObjectService();
    service = mocks.importConfigSavedObjectService;
    mockSoClient = mocks.mockSavedObjectsClient;
  });

  it('creates with the provided id and without overwriting', async () => {
    mockSoClient.create.mockResolvedValue({
      id: 'import-1',
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attributes: mockAttrs,
      references: [],
      version: 'v1',
    });

    const result = await service.create({ attrs: mockAttrs, id: 'import-1' });

    expect(result).toEqual({ id: 'import-1', version: 'v1' });
    expect(mockSoClient.create).toHaveBeenCalledWith(IMPORT_CONFIG_SAVED_OBJECT_TYPE, mockAttrs, {
      id: 'import-1',
      overwrite: false,
    });
  });

  it('generates an id when none is given', async () => {
    mockSoClient.create.mockResolvedValue({
      id: 'generated',
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attributes: mockAttrs,
      references: [],
    });

    await service.create({ attrs: mockAttrs });

    expect(mockSoClient.create).toHaveBeenCalledWith(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      mockAttrs,
      expect.objectContaining({ id: expect.any(String), overwrite: false })
    );
  });

  it('gets by id', async () => {
    mockSoClient.get.mockResolvedValue({
      id: 'import-1',
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attributes: mockAttrs,
      references: [],
      version: 'v1',
    });

    await expect(service.get('import-1')).resolves.toEqual({
      id: 'import-1',
      attributes: mockAttrs,
      version: 'v1',
    });
  });

  it('passes the version on update', async () => {
    mockSoClient.update.mockResolvedValue({
      id: 'import-1',
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attributes: {},
      references: [],
      version: 'v2',
    });

    const result = await service.update({
      id: 'import-1',
      attrs: { enabled: false },
      version: 'v1',
    });

    expect(result).toEqual({ id: 'import-1', version: 'v2' });
    expect(mockSoClient.update).toHaveBeenCalledWith(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      'import-1',
      { enabled: false },
      { version: 'v1' }
    );
  });

  it('deletes by id', async () => {
    await service.delete({ id: 'import-1' });

    expect(mockSoClient.delete).toHaveBeenCalledWith(IMPORT_CONFIG_SAVED_OBJECT_TYPE, 'import-1');
  });

  it('searches name and description when given a search string', async () => {
    mockSoClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 20,
    });

    await service.find({ page: 1, perPage: 20, search: 'data' });

    expect(mockSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        search: 'data',
        searchFields: ['name', 'description'],
        sortField: 'name.keyword',
      })
    );
  });
});
