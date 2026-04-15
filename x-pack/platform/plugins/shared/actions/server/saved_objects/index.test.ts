/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsServiceSetup,
  ISavedObjectsRepository,
} from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { createMockInMemoryConnector } from '../application/connector/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { setupSavedObjects } from '.';
import type { RawAction } from '../types';
import type { ActionTypeRegistry } from '../action_type_registry';

describe('setupSavedObjects - onImport', () => {
  let savedObjectsSetup: jest.Mocked<SavedObjectsServiceSetup>;
  let encryptedSavedObjects: ReturnType<typeof encryptedSavedObjectsMock.createSetup>;
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let mockRepo: jest.Mocked<Pick<ISavedObjectsRepository, 'bulkDelete'>>;

  const createConnector = (
    id: string,
    overrides: Partial<SavedObject<RawAction> & { destinationId?: string }> = {}
  ) =>
    ({
      type: 'action',
      id,
      attributes: {
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
        isMissingSecrets: false,
      },
      references: [],
      namespaces: ['default'],
      ...overrides,
    } as unknown as SavedObject<RawAction> & { destinationId?: string });

  let onImport: (connectors: SavedObject[]) => Promise<{ warnings: unknown[] }>;

  beforeEach(() => {
    savedObjectsSetup = {
      registerType: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsServiceSetup>;

    encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();
    actionTypeRegistry = actionTypeRegistryMock.create();
    mockRepo = { bulkDelete: jest.fn().mockResolvedValue({ statuses: [] }) };

    setupSavedObjects(
      savedObjectsSetup,
      encryptedSavedObjects,
      actionTypeRegistry as unknown as ActionTypeRegistry,
      '.kibana_task_manager',
      [createMockInMemoryConnector({ id: 'preconfigured-id', isPreconfigured: true })],
      () => mockRepo as unknown as ISavedObjectsRepository
    );

    const registeredType = savedObjectsSetup.registerType.mock.calls[0][0];
    onImport = registeredType.management!.onImport! as typeof onImport;
  });

  it('calls bulkDelete for connectors that conflict with preconfigured ids', async () => {
    const connectors = [createConnector('preconfigured-id'), createConnector('regular-connector')];

    await onImport(connectors);

    expect(mockRepo.bulkDelete).toHaveBeenCalledWith([{ type: 'action', id: 'preconfigured-id' }], {
      namespace: 'default',
    });
  });

  it('does not call bulkDelete when there are no conflicts', async () => {
    const connectors = [createConnector('regular-connector')];

    await onImport(connectors);

    expect(mockRepo.bulkDelete).not.toHaveBeenCalled();
  });

  it('does not delete connectors that have a destinationId (regenerated id)', async () => {
    const connectors = [createConnector('preconfigured-id', { destinationId: 'new-uuid' })];

    await onImport(connectors);

    expect(mockRepo.bulkDelete).not.toHaveBeenCalled();
  });

  it('calls bulkDelete for connectors with invalid ids', async () => {
    const connectors = [createConnector('Invalid ID')];

    await onImport(connectors);

    expect(mockRepo.bulkDelete).toHaveBeenCalledWith([{ type: 'action', id: 'Invalid ID' }], {
      namespace: 'default',
    });
  });

  it('deduplicates connectors that are both preconfigured conflicts and have invalid ids', async () => {
    const connectors = [createConnector('preconfigured-id')];

    await onImport(connectors);

    expect(mockRepo.bulkDelete).toHaveBeenCalledTimes(1);
    expect(mockRepo.bulkDelete).toHaveBeenCalledWith([{ type: 'action', id: 'preconfigured-id' }], {
      namespace: 'default',
    });
  });

  it('returns warnings even when deletion occurs', async () => {
    const connectors = [
      createConnector('preconfigured-id'),
      createConnector('regular', {
        attributes: {
          actionTypeId: '.email',
          name: 'email',
          config: {},
          secrets: {},
          isMissingSecrets: true,
        },
      }),
    ];

    const result = await onImport(connectors);

    expect(mockRepo.bulkDelete).toHaveBeenCalled();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
