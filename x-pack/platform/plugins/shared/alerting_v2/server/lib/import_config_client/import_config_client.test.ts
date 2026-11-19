/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CreateImportConfigData } from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ImportConfigSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  createImportConfigSavedObjectServiceMock,
  type ImportConfigSavedObjectServiceMock,
} from '../services/import_config_saved_object_service/import_config_saved_object_service.mock';
import type { ImportConfigSavedObjectDoc } from '../services/import_config_saved_object_service/types';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import { ImportConfigClient } from './import_config_client';

const NOW = '2025-02-01T00:00:00.000Z';
const CREATED_AT = '2025-01-01T00:00:00.000Z';
const ACTOR = { profile_uid: 'elastic_profile_uid' };
const CREATOR = { profile_uid: 'creator_profile_uid' };
const CONNECTOR_REFERENCE = { name: 'connector', type: 'action', id: 'connector-1' };

const createData = (overrides: Partial<CreateImportConfigData> = {}): CreateImportConfigData => ({
  kind: 'alert',
  metadata: {
    name: 'Datadog production',
    description: 'Alerts from the production Datadog account',
    tags: ['datadog'],
    routing_tags: ['team-a'],
  },
  connector_id: 'connector-1',
  ...overrides,
});

const storedAttributes = (
  overrides: Partial<ImportConfigSavedObjectAttributes> = {}
): ImportConfigSavedObjectAttributes => ({
  kind: 'alert',
  metadata: {
    name: 'Datadog production',
    description: 'Alerts from the production Datadog account',
    tags: ['datadog'],
    routing_tags: ['team-a'],
  },
  connector_id: 'connector-1',
  version: 3,
  createdBy: CREATOR,
  updatedBy: CREATOR,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

const storedDoc = (
  overrides: Partial<ImportConfigSavedObjectDoc> = {}
): ImportConfigSavedObjectDoc => ({
  id: 'import-1',
  attributes: storedAttributes(),
  version: 'WzEsMV0=',
  references: [CONNECTOR_REFERENCE],
  ...overrides,
});

const getBoomData = (error: unknown) => (Boom.isBoom(error) ? error.data : undefined);

describe('ImportConfigClient', () => {
  let savedObjectService: ImportConfigSavedObjectServiceMock;
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let client: ImportConfigClient;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW));
    savedObjectService = createImportConfigSavedObjectServiceMock();
    const logger = createLoggerService();
    mockLogger = logger.mockLogger;
    client = new ImportConfigClient(
      savedObjectService,
      createUserService().userService,
      logger.loggerService
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createImportConfig', () => {
    it('stores the attributes and a connector reference, and returns the import', async () => {
      savedObjectService.create.mockResolvedValue({ id: 'import-1', version: 'WzEsMV0=' });

      const result = await client.createImportConfig({ data: createData({ id: 'import-1' }) });

      expect(savedObjectService.create).toHaveBeenCalledWith({
        id: 'import-1',
        attrs: {
          kind: 'alert',
          metadata: {
            name: 'Datadog production',
            description: 'Alerts from the production Datadog account',
            tags: ['datadog'],
            routing_tags: ['team-a'],
          },
          connector_id: 'connector-1',
          version: 1,
          createdBy: ACTOR,
          updatedBy: ACTOR,
          createdAt: NOW,
          updatedAt: NOW,
        },
        references: [CONNECTOR_REFERENCE],
      });
      expect(result).toEqual({
        id: 'import-1',
        kind: 'alert',
        metadata: {
          name: 'Datadog production',
          description: 'Alerts from the production Datadog account',
          tags: ['datadog'],
          routing_tags: ['team-a'],
        },
        connector_id: 'connector-1',
        version: 1,
        created_by: ACTOR,
        created_at: NOW,
        updated_by: ACTOR,
        updated_at: NOW,
      });
    });

    it('leaves optional metadata unset when it is omitted', async () => {
      savedObjectService.create.mockResolvedValue({ id: 'generated-id' });

      const result = await client.createImportConfig({
        data: createData({ kind: 'signal', metadata: { name: 'Signals only' } }),
      });

      expect(savedObjectService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          attrs: expect.objectContaining({ metadata: { name: 'Signals only' } }),
        })
      );
      expect(result.id).toBe('generated-id');
      expect(result.metadata).toEqual({ name: 'Signals only' });
    });

    it('throws IMPORT_CONFIG_ALREADY_EXISTS when the id is taken', async () => {
      savedObjectService.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(IMPORT_CONFIG_SAVED_OBJECT_TYPE, 'import-1')
      );

      const error = await client
        .createImportConfig({ data: createData({ id: 'import-1' }) })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(409);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_ALREADY_EXISTS,
        details: { import_config_id: 'import-1' },
      });
    });

    it('throws INVALID_IMPORT_CONFIG_DATA when the data fails validation', async () => {
      const error = await client
        .createImportConfig({
          data: { ...createData(), connector_id: '' },
        })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(400);
      expect(getBoomData(error)).toEqual(
        expect.objectContaining({
          code: ALERTING_ERROR_CODES.INVALID_IMPORT_CONFIG_DATA,
          details: expect.objectContaining({ context: 'create' }),
        })
      );
      expect(savedObjectService.create).not.toHaveBeenCalled();
    });

    it('rejects routing tags on a signal import', async () => {
      const error = await client
        .createImportConfig({
          data: createData({ kind: 'signal' }),
        })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_IMPORT_CONFIG_DATA })
      );
      expect(savedObjectService.create).not.toHaveBeenCalled();
    });
  });

  describe('getImportConfig', () => {
    it('returns the import with the connector id from its reference', async () => {
      savedObjectService.get.mockResolvedValue(
        storedDoc({
          attributes: storedAttributes({ connector_id: 'connector-before-copy' }),
          references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }],
        })
      );

      const result = await client.getImportConfig({ id: 'import-1' });

      expect(result).toEqual({
        id: 'import-1',
        kind: 'alert',
        metadata: {
          name: 'Datadog production',
          description: 'Alerts from the production Datadog account',
          tags: ['datadog'],
          routing_tags: ['team-a'],
        },
        connector_id: 'connector-after-copy',
        version: 3,
        created_by: CREATOR,
        created_at: CREATED_AT,
        updated_by: CREATOR,
        updated_at: CREATED_AT,
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('falls back to the stored connector id and logs when the reference is missing', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc({ references: [] }));

      const result = await client.getImportConfig({ id: 'import-1' });

      expect(result.connector_id).toBe('connector-1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.IMPORT_CONFIG_CONNECTOR_REFERENCE_NOT_FOUND,
            import_config_id: 'import-1',
            connector_id: 'connector-1',
          }),
        })
      );
    });

    it('throws IMPORT_CONFIG_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          IMPORT_CONFIG_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client.getImportConfig({ id: 'missing' }).catch((e) => e);

      expect(error.output.statusCode).toBe(404);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_NOT_FOUND,
        details: { import_config_id: 'missing' },
      });
    });

    it('lets other saved object errors through', async () => {
      const failure = new Error('cluster unavailable');
      savedObjectService.get.mockRejectedValue(failure);

      await expect(client.getImportConfig({ id: 'import-1' })).rejects.toBe(failure);
    });
  });

  describe('updateImportConfig', () => {
    it('merges the patch, increments the version and keeps the creation fields', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());

      const result = await client.updateImportConfig({
        id: 'import-1',
        data: { metadata: { name: 'Datadog prod', description: null } },
      });

      expect(savedObjectService.update).toHaveBeenCalledWith({
        id: 'import-1',
        version: 'WzEsMV0=',
        attrs: {
          kind: 'alert',
          metadata: { name: 'Datadog prod', tags: ['datadog'], routing_tags: ['team-a'] },
          connector_id: 'connector-1',
          version: 4,
          createdBy: CREATOR,
          updatedBy: ACTOR,
          createdAt: CREATED_AT,
          updatedAt: NOW,
        },
        references: [CONNECTOR_REFERENCE],
      });
      expect(result).toEqual(
        expect.objectContaining({ version: 4, updated_by: ACTOR, updated_at: NOW })
      );
    });

    it('writes the connector id from the reference to both copies', async () => {
      savedObjectService.get.mockResolvedValue(
        storedDoc({
          attributes: storedAttributes({ connector_id: 'connector-before-copy' }),
          references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }],
        })
      );

      await client.updateImportConfig({ id: 'import-1', data: { metadata: { name: 'Renamed' } } });

      expect(savedObjectService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          attrs: expect.objectContaining({ connector_id: 'connector-after-copy' }),
          references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }],
        })
      );
    });

    it('rejects a change of kind to signal while routing tags are set', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());

      const error = await client
        .updateImportConfig({ id: 'import-1', data: { kind: 'signal' } })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({
          code: ALERTING_ERROR_CODES.INVALID_IMPORT_CONFIG_DATA,
          details: expect.objectContaining({ context: 'update' }),
        })
      );
      expect(savedObjectService.update).not.toHaveBeenCalled();
    });

    it('accepts a change of kind to signal when the routing tags are cleared', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());

      await client.updateImportConfig({
        id: 'import-1',
        data: { kind: 'signal', metadata: { routing_tags: null } },
      });

      expect(savedObjectService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          attrs: expect.objectContaining({
            kind: 'signal',
            metadata: {
              name: 'Datadog production',
              description: 'Alerts from the production Datadog account',
              tags: ['datadog'],
            },
          }),
        })
      );
    });

    it('does not accept a new connector id', async () => {
      const error = await client
        .updateImportConfig({
          id: 'import-1',
          data: { connector_id: 'connector-2' } as never,
        })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_IMPORT_CONFIG_DATA })
      );
      expect(savedObjectService.get).not.toHaveBeenCalled();
    });

    it('throws IMPORT_CONFIG_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          IMPORT_CONFIG_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client
        .updateImportConfig({ id: 'missing', data: { metadata: { name: 'Renamed' } } })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_NOT_FOUND,
        details: { import_config_id: 'missing' },
      });
    });

    it('throws IMPORT_CONFIG_VERSION_CONFLICT when another writer updated the import', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());
      savedObjectService.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(IMPORT_CONFIG_SAVED_OBJECT_TYPE, 'import-1')
      );

      const error = await client
        .updateImportConfig({ id: 'import-1', data: { metadata: { name: 'Renamed' } } })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(409);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_VERSION_CONFLICT,
        details: { import_config_id: 'import-1' },
      });
    });
  });

  describe('deleteImportConfig', () => {
    it('deletes the import', async () => {
      await client.deleteImportConfig({ id: 'import-1' });

      expect(savedObjectService.delete).toHaveBeenCalledWith({ id: 'import-1' });
    });

    it('throws IMPORT_CONFIG_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.delete.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          IMPORT_CONFIG_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client.deleteImportConfig({ id: 'missing' }).catch((e) => e);

      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_NOT_FOUND,
        details: { import_config_id: 'missing' },
      });
    });
  });

  describe('findImportConfigs', () => {
    it('uses the default page and sort, and resolves each connector from its reference', async () => {
      savedObjectService.find.mockResolvedValue({
        saved_objects: [
          storedDoc({ references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }] }),
        ],
        total: 1,
      });

      const result = await client.findImportConfigs();

      expect(savedObjectService.find).toHaveBeenCalledWith({
        page: 1,
        perPage: 20,
        search: undefined,
        sortField: undefined,
        sortOrder: undefined,
        connectorId: undefined,
      });
      expect(result).toEqual({
        items: [expect.objectContaining({ id: 'import-1', connector_id: 'connector-after-copy' })],
        total: 1,
        page: 1,
        per_page: 20,
      });
    });

    it('maps the sort field and passes the search and connector filter', async () => {
      await client.findImportConfigs({
        page: 2,
        perPage: 50,
        search: 'datadog',
        sortField: 'name',
        sortOrder: 'desc',
        connectorId: 'connector-1',
      });

      expect(savedObjectService.find).toHaveBeenCalledWith({
        page: 2,
        perPage: 50,
        search: expect.any(String),
        sortField: 'metadata.name.keyword',
        sortOrder: 'desc',
        connectorId: 'connector-1',
      });
    });
  });
});
