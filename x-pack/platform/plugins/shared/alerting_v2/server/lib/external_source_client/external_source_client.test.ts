/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CreateExternalSourceData } from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { EXTERNAL_SOURCE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ExternalSourceSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  createExternalSourceSavedObjectServiceMock,
  type ExternalSourceSavedObjectServiceMock,
} from '../services/external_source_saved_object_service/external_source_saved_object_service.mock';
import type { ExternalSourceSavedObjectDoc } from '../services/external_source_saved_object_service/types';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import { ExternalSourceClient } from './external_source_client';

const NOW = '2025-02-01T00:00:00.000Z';
const CREATED_AT = '2025-01-01T00:00:00.000Z';
const ACTOR = { profile_uid: 'elastic_profile_uid' };
const CREATOR = { profile_uid: 'creator_profile_uid' };
const CONNECTOR_REFERENCE = { name: 'connector', type: 'action', id: 'connector-1' };

const createData = (
  overrides: Partial<CreateExternalSourceData> = {}
): CreateExternalSourceData => ({
  type: 'datadog',
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
  overrides: Partial<ExternalSourceSavedObjectAttributes> = {}
): ExternalSourceSavedObjectAttributes => ({
  type: 'datadog',
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
  overrides: Partial<ExternalSourceSavedObjectDoc> = {}
): ExternalSourceSavedObjectDoc => ({
  id: 'import-1',
  attributes: storedAttributes(),
  version: 'WzEsMV0=',
  references: [CONNECTOR_REFERENCE],
  ...overrides,
});

const getBoomData = (error: unknown) => (Boom.isBoom(error) ? error.data : undefined);

describe('ExternalSourceClient', () => {
  let savedObjectService: ExternalSourceSavedObjectServiceMock;
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let client: ExternalSourceClient;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW));
    savedObjectService = createExternalSourceSavedObjectServiceMock();
    const logger = createLoggerService();
    mockLogger = logger.mockLogger;
    client = new ExternalSourceClient(
      savedObjectService,
      createUserService().userService,
      logger.loggerService
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createExternalSource', () => {
    it('stores the attributes and a connector reference, and returns the import', async () => {
      savedObjectService.create.mockResolvedValue({ id: 'import-1', version: 'WzEsMV0=' });

      const result = await client.createExternalSource({ data: createData({ id: 'import-1' }) });

      expect(savedObjectService.create).toHaveBeenCalledWith({
        id: 'import-1',
        attrs: {
          type: 'datadog',
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
        type: 'datadog',
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

      const result = await client.createExternalSource({
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

    it('throws EXTERNAL_SOURCE_ALREADY_EXISTS when the id is taken', async () => {
      savedObjectService.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(EXTERNAL_SOURCE_SAVED_OBJECT_TYPE, 'import-1')
      );

      const error = await client
        .createExternalSource({ data: createData({ id: 'import-1' }) })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(409);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_ALREADY_EXISTS,
        details: { external_source_id: 'import-1' },
      });
    });

    it('throws INVALID_EXTERNAL_SOURCE_DATA when the data fails validation', async () => {
      const error = await client
        .createExternalSource({
          data: { ...createData(), connector_id: '' },
        })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(400);
      expect(getBoomData(error)).toEqual(
        expect.objectContaining({
          code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA,
          details: expect.objectContaining({ context: 'create' }),
        })
      );
      expect(savedObjectService.create).not.toHaveBeenCalled();
    });

    it('rejects routing tags on a signal import', async () => {
      const error = await client
        .createExternalSource({
          data: createData({ kind: 'signal' }),
        })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA })
      );
      expect(savedObjectService.create).not.toHaveBeenCalled();
    });
  });

  describe('getExternalSource', () => {
    it('returns the import with the connector id from its reference', async () => {
      savedObjectService.get.mockResolvedValue(
        storedDoc({
          attributes: storedAttributes({ connector_id: 'connector-before-copy' }),
          references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }],
        })
      );

      const result = await client.getExternalSource({ id: 'import-1' });

      expect(result).toEqual({
        id: 'import-1',
        type: 'datadog',
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

      const result = await client.getExternalSource({ id: 'import-1' });

      expect(result.connector_id).toBe('connector-1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.EXTERNAL_SOURCE_CONNECTOR_REFERENCE_NOT_FOUND,
            external_source_id: 'import-1',
            connector_id: 'connector-1',
          }),
        })
      );
    });

    it('throws EXTERNAL_SOURCE_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client.getExternalSource({ id: 'missing' }).catch((e) => e);

      expect(error.output.statusCode).toBe(404);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_NOT_FOUND,
        details: { external_source_id: 'missing' },
      });
    });

    it('lets other saved object errors through', async () => {
      const failure = new Error('cluster unavailable');
      savedObjectService.get.mockRejectedValue(failure);

      await expect(client.getExternalSource({ id: 'import-1' })).rejects.toBe(failure);
    });
  });

  describe('updateExternalSource', () => {
    it('merges the patch, increments the version and keeps the creation fields', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());

      const result = await client.updateExternalSource({
        id: 'import-1',
        data: { metadata: { name: 'Datadog prod', description: null } },
      });

      expect(savedObjectService.update).toHaveBeenCalledWith({
        id: 'import-1',
        version: 'WzEsMV0=',
        attrs: {
          type: 'datadog',
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

      await client.updateExternalSource({
        id: 'import-1',
        data: { metadata: { name: 'Renamed' } },
      });

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
        .updateExternalSource({ id: 'import-1', data: { kind: 'signal' } })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({
          code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA,
          details: expect.objectContaining({ context: 'update' }),
        })
      );
      expect(savedObjectService.update).not.toHaveBeenCalled();
    });

    it('accepts a change of kind to signal when the routing tags are cleared', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());

      await client.updateExternalSource({
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
        .updateExternalSource({
          id: 'import-1',
          data: { connector_id: 'connector-2' } as never,
        })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA })
      );
      expect(savedObjectService.get).not.toHaveBeenCalled();
    });

    it('does not accept a new type', async () => {
      const error = await client
        .updateExternalSource({ id: 'import-1', data: { type: 'datadog' } as never })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA })
      );
      expect(savedObjectService.get).not.toHaveBeenCalled();
    });

    it('throws EXTERNAL_SOURCE_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client
        .updateExternalSource({ id: 'missing', data: { metadata: { name: 'Renamed' } } })
        .catch((e) => e);

      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_NOT_FOUND,
        details: { external_source_id: 'missing' },
      });
    });

    it('throws EXTERNAL_SOURCE_NOT_FOUND when the import is deleted before the write', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());
      savedObjectService.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
          'import-1'
        )
      );

      const error = await client
        .updateExternalSource({ id: 'import-1', data: { metadata: { name: 'Renamed' } } })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(404);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_NOT_FOUND,
        details: { external_source_id: 'import-1' },
      });
    });

    it('throws EXTERNAL_SOURCE_VERSION_CONFLICT when another writer updated the import', async () => {
      savedObjectService.get.mockResolvedValue(storedDoc());
      savedObjectService.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(EXTERNAL_SOURCE_SAVED_OBJECT_TYPE, 'import-1')
      );

      const error = await client
        .updateExternalSource({ id: 'import-1', data: { metadata: { name: 'Renamed' } } })
        .catch((e) => e);

      expect(error.output.statusCode).toBe(409);
      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_VERSION_CONFLICT,
        details: { external_source_id: 'import-1' },
      });
    });
  });

  describe('deleteExternalSource', () => {
    it('deletes the import', async () => {
      await client.deleteExternalSource({ id: 'import-1' });

      expect(savedObjectService.delete).toHaveBeenCalledWith({ id: 'import-1' });
    });

    it('throws EXTERNAL_SOURCE_NOT_FOUND when the import does not exist', async () => {
      savedObjectService.delete.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const error = await client.deleteExternalSource({ id: 'missing' }).catch((e) => e);

      expect(getBoomData(error)).toEqual({
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_NOT_FOUND,
        details: { external_source_id: 'missing' },
      });
    });
  });

  describe('findExternalSources', () => {
    it('uses the default page and sort, and resolves each connector from its reference', async () => {
      savedObjectService.find.mockResolvedValue({
        saved_objects: [
          storedDoc({ references: [{ ...CONNECTOR_REFERENCE, id: 'connector-after-copy' }] }),
        ],
        total: 1,
      });

      const result = await client.findExternalSources();

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

    it('maps the sort field and passes the search, connector and type filters', async () => {
      await client.findExternalSources({
        page: 2,
        perPage: 50,
        search: 'datadog',
        sortField: 'name',
        sortOrder: 'desc',
        connectorId: 'connector-1',
        type: 'datadog',
      });

      expect(savedObjectService.find).toHaveBeenCalledWith({
        page: 2,
        perPage: 50,
        search: expect.any(String),
        sortField: 'metadata.name.keyword',
        sortOrder: 'desc',
        connectorId: 'connector-1',
        type: 'datadog',
      });
    });

    it('sorts by the type attribute', async () => {
      savedObjectService.find.mockResolvedValue({ saved_objects: [], total: 0 });
      await client.findExternalSources({ sortField: 'type' });

      expect(savedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'type' })
      );
    });
  });
});
