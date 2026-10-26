/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock } from '@kbn/core/server/mocks';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import {
  getWorkloadBindingId,
  registerWorkloadBindingSavedObjectType,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';

const coordinates = {
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId: 'w-1',
  spaceId: 'marketing',
};

const registeredType = (): SavedObjectsType => {
  const savedObjects = savedObjectsServiceMock.createSetupContract();
  registerWorkloadBindingSavedObjectType(savedObjects, encryptedSavedObjectsMock.createSetup());
  return savedObjects.registerType.mock.calls[0][0];
};

const v1Document = (): SavedObject<Record<string, unknown>> => ({
  id: getWorkloadBindingId(coordinates),
  type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
  namespaces: ['marketing'],
  attributes: {
    ...coordinates,
    serviceAccountId: 'sa-1',
    boundBy: { type: 'user', username: 'elastic' },
    boundAt: '2026-10-01T00:00:00.000Z',
    canary: 'encrypted-canary',
  },
  references: [],
});

describe('service account workload binding model versions', () => {
  describe('v1 to v2', () => {
    const migrator = createModelVersionTestMigrator({ type: registeredType() });

    it('backfills the binding key with the binding ID, and leaves everything else as it was', () => {
      const document = v1Document();

      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });

      expect(migrated.attributes).toEqual({
        ...document.attributes,
        bindingKey: getWorkloadBindingId(coordinates),
      });
    });

    it('drops the binding key when an older node reads a v2 document', () => {
      const document = migrator.migrate({ document: v1Document(), fromVersion: 1, toVersion: 2 });

      const downgraded = migrator.migrate({ document, fromVersion: 2, toVersion: 1 });

      expect(downgraded.attributes).not.toHaveProperty('bindingKey');
    });
  });

  it('maps the binding key, so the cleanup can sort and page on it', () => {
    const { mappings, modelVersions } = registeredType();

    expect(mappings.properties?.bindingKey).toEqual({ type: 'keyword', ignore_above: 1024 });
    // Only the top-level attribute: a nested copy would be a mapping no model version declares.
    expect(JSON.stringify(mappings.properties?.boundBy)).not.toContain('bindingKey');
    expect(
      typeof modelVersions === 'object' && !Array.isArray(modelVersions)
        ? modelVersions[2]?.changes
        : undefined
    ).toContainEqual({
      type: 'mappings_addition',
      addedMappings: { bindingKey: { type: 'keyword', ignore_above: 1024 } },
    });
  });
});
