/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ImportConfigSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ImportConfigSavedObjectServiceContract } from '../services/import_config_saved_object_service/types';
import type { UserServiceContract } from '../services/user_service/user_service';
import { ImportConfigClient } from './import_config_client';

const attrs: ImportConfigSavedObjectAttributes = {
  name: 'Datadog',
  kind: 'custom',
  enabled: true,
  source: 'datadog',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: ['prod'],
  routing_tags: [],
  created_by: { profile_uid: 'user-1' },
  updated_by: { profile_uid: 'user-1' },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('ImportConfigClient', () => {
  let service: jest.Mocked<ImportConfigSavedObjectServiceContract>;
  let userService: jest.Mocked<UserServiceContract>;
  let client: ImportConfigClient;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-02-02T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    service = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };
    userService = {
      getCurrentUserProfileUid: jest.fn().mockResolvedValue('user-1'),
      getCurrentActor: jest.fn().mockResolvedValue({ profile_uid: 'user-1' }),
    };
    client = new ImportConfigClient(service, userService);
  });

  it('creates a custom, enabled record carrying the ids it is given', async () => {
    service.create.mockResolvedValue({ id: 'import-1' });

    const created = await client.createImportConfig({
      data: {
        name: 'Datadog',
        tags: ['prod'],
      },
      id: 'import-1',
      source: 'datadog',
      connectorId: 'connector-1',
      workflowId: 'workflow-1',
    });

    expect(service.create).toHaveBeenCalledWith({
      id: 'import-1',
      attrs: expect.objectContaining({
        kind: 'custom',
        enabled: true,
        source: 'datadog',
        connector_id: 'connector-1',
        workflow_id: 'workflow-1',
        created_by: { profile_uid: 'user-1' },
        created_at: '2025-02-02T00:00:00.000Z',
      }),
    });
    expect(created).toMatchObject({ id: 'import-1', kind: 'custom', tags: ['prod'] });
  });

  it('maps a missing record to a 404 with the import code', async () => {
    service.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(IMPORT_CONFIG_SAVED_OBJECT_TYPE, 'nope')
    );

    await expect(client.getImportConfig({ id: 'nope' })).rejects.toMatchObject({
      output: { statusCode: 404 },
      data: { code: ALERTING_ERROR_CODES.IMPORT_NOT_FOUND },
    });
  });

  it('merges an update over the stored record and stamps who and when', async () => {
    service.get.mockResolvedValue({ id: 'import-1', attributes: attrs, version: 'v1' });
    service.update.mockResolvedValue({ id: 'import-1', version: 'v2' });

    const updated = await client.updateImportConfig({ id: 'import-1', data: { enabled: false } });

    expect(service.update).toHaveBeenCalledWith({
      id: 'import-1',
      version: 'v1',
      attrs: expect.objectContaining({
        enabled: false,
        name: 'Datadog',
        updated_at: '2025-02-02T00:00:00.000Z',
      }),
    });
    expect(updated).toMatchObject({ enabled: false, created_at: '2025-01-01T00:00:00.000Z' });
  });

  it('maps a version conflict on update to a 409', async () => {
    service.get.mockResolvedValue({ id: 'import-1', attributes: attrs, version: 'v1' });
    service.update.mockRejectedValue(SavedObjectsErrorHelpers.createConflictError('t', 'import-1'));

    await expect(
      client.updateImportConfig({ id: 'import-1', data: { enabled: false } })
    ).rejects.toMatchObject({ output: { statusCode: 409 } });
  });

  it('lists with defaults and reports the page it used', async () => {
    service.find.mockResolvedValue({
      saved_objects: [{ id: 'import-1', attributes: attrs }],
      total: 1,
    });

    const result = await client.findImportConfigs();

    expect(service.find).toHaveBeenCalledWith({ page: 1, perPage: 20, search: undefined });
    expect(result).toMatchObject({ total: 1, page: 1, perPage: 20 });
    expect(result.items[0]).toMatchObject({ id: 'import-1' });
  });

  it('deletes by id and maps a missing record to a 404', async () => {
    service.delete.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(IMPORT_CONFIG_SAVED_OBJECT_TYPE, 'nope')
    );

    await expect(client.deleteImportConfig({ id: 'nope' })).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
  });
});
