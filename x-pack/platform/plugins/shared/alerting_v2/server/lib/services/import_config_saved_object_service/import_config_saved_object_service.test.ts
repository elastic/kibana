/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';
import { createImportConfigSavedObjectService } from './import_config_saved_object_service.mock';

const attributes: ImportConfigSavedObjectAttributes = {
  kind: 'alert',
  metadata: { name: 'Datadog production' },
  connector_id: 'connector-1',
  version: 1,
  createdBy: { profile_uid: 'u_1' },
  updatedBy: { profile_uid: 'u_1' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const references = [{ name: 'connector', type: 'action', id: 'connector-1' }];

const emptyFindResult = { saved_objects: [], total: 0, page: 1, per_page: 20 };

const savedObject = (
  overrides: Partial<SavedObject<ImportConfigSavedObjectAttributes>> = {}
): SavedObject<ImportConfigSavedObjectAttributes> => ({
  id: 'import-1',
  type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
  attributes,
  references,
  version: 'WzEsMV0=',
  ...overrides,
});

describe('ImportConfigSavedObjectService', () => {
  describe('create', () => {
    it('creates the saved object with its references and without overwriting', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.create.mockResolvedValue(savedObject());

      const result = await importConfigSavedObjectService.create({
        attrs: attributes,
        references,
        id: 'import-1',
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        attributes,
        { id: 'import-1', overwrite: false, references }
      );
      expect(result).toEqual({ id: 'import-1', version: 'WzEsMV0=' });
    });

    it('generates an id when none is given', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.create.mockResolvedValue(savedObject());

      await importConfigSavedObjectService.create({ attrs: attributes, references });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        attributes,
        expect.objectContaining({ id: expect.any(String) })
      );
    });
  });

  describe('get', () => {
    it('returns the attributes, version and references', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.get.mockResolvedValue(savedObject());

      const result = await importConfigSavedObjectService.get('import-1');

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        'import-1',
        undefined
      );
      expect(result).toEqual({
        id: 'import-1',
        attributes,
        version: 'WzEsMV0=',
        references,
      });
    });

    it('returns empty references when the saved object has none', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.get.mockResolvedValue(
        savedObject({ references: undefined as unknown as [] })
      );

      const result = await importConfigSavedObjectService.get('import-1');

      expect(result.references).toEqual([]);
    });
  });

  describe('update', () => {
    it('replaces the attributes and references, using the version for concurrency control', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.update.mockResolvedValue({
        id: 'import-1',
        type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        attributes,
        references,
        version: 'WzIsMV0=',
      });

      const result = await importConfigSavedObjectService.update({
        id: 'import-1',
        attrs: attributes,
        references,
        version: 'WzEsMV0=',
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        'import-1',
        attributes,
        { version: 'WzEsMV0=', mergeAttributes: false, references }
      );
      expect(result).toEqual({ id: 'import-1', version: 'WzIsMV0=' });
    });
  });

  describe('delete', () => {
    it('deletes the saved object', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();

      await importConfigSavedObjectService.delete({ id: 'import-1' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        'import-1'
      );
    });
  });

  describe('find', () => {
    it('sorts by name by default and returns the references of each result', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [{ ...savedObject(), score: 1 }],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await importConfigSavedObjectService.find({ page: 1, perPage: 20 });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 20,
        sortField: 'metadata.name.keyword',
        sortOrder: 'asc',
      });
      expect(result).toEqual({
        saved_objects: [{ id: 'import-1', attributes, version: 'WzEsMV0=', references }],
        total: 1,
      });
    });

    it('searches the name and description fields', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.find.mockResolvedValue(emptyFindResult);

      await importConfigSavedObjectService.find({ page: 1, perPage: 20, search: 'datadog*' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'datadog*',
          searchFields: ['metadata.name', 'metadata.description'],
          defaultSearchOperator: 'AND',
        })
      );
    });

    it('finds the import configs that reference a connector', async () => {
      const { importConfigSavedObjectService, mockSavedObjectsClient } =
        createImportConfigSavedObjectService();
      mockSavedObjectsClient.find.mockResolvedValue(emptyFindResult);

      await importConfigSavedObjectService.find({
        page: 1,
        perPage: 20,
        connectorId: 'connector-1',
      });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ hasReference: { type: 'action', id: 'connector-1' } })
      );
    });
  });
});
