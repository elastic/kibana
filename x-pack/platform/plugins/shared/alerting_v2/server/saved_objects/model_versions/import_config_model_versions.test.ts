/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { importConfigMappings } from '../import_config_mappings';
import { importConfigModelVersions } from './import_config_model_versions';

const importConfigType: SavedObjectsType = {
  name: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: importConfigMappings,
  modelVersions: importConfigModelVersions,
};

const createImportConfigDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'import-1',
  type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
  attributes: {
    kind: 'alert',
    metadata: {
      name: 'Datadog production',
      description: 'Alerts from the production Datadog account',
      tags: ['datadog'],
      routing_tags: ['team-a'],
    },
    connector_id: 'connector-1',
    version: 1,
    createdBy: { profile_uid: 'u_1' },
    updatedBy: { profile_uid: 'u_1' },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  },
  references: [{ name: 'connector', type: 'action', id: 'connector-1' }],
});

describe('importConfigModelVersions', () => {
  const migrator = createModelVersionTestMigrator({ type: importConfigType });

  it('defines model version 1 with no changes', () => {
    expect(Object.keys(importConfigModelVersions)).toEqual(['1']);
    expect(importConfigModelVersions['1']).toMatchObject({ changes: [] });
  });

  it('keeps the document and its connector reference unchanged at version 1', () => {
    const document = createImportConfigDocument();

    const migrated = migrator.migrate({ document, fromVersion: 0, toVersion: 1 });

    expect(migrated.attributes).toEqual(document.attributes);
    expect(migrated.references).toEqual(document.references);
  });

  it('drops attributes it does not know when read by an older version', () => {
    const forwardCompatibility = importConfigModelVersions['1']?.schemas
      ?.forwardCompatibility as ObjectType;
    const { attributes } = createImportConfigDocument({ added_by_a_newer_version: 'value' });

    expect(forwardCompatibility.validate(attributes)).not.toHaveProperty(
      'added_by_a_newer_version'
    );
  });

  describe('create schema', () => {
    const create = importConfigModelVersions['1']?.schemas?.create as ObjectType;

    it('accepts a valid import', () => {
      const { attributes } = createImportConfigDocument();

      expect(() => create.validate(attributes)).not.toThrow();
    });

    it('accepts an import with only a name in its metadata', () => {
      const { attributes } = createImportConfigDocument({ metadata: { name: 'Minimal' } });

      expect(() => create.validate(attributes)).not.toThrow();
    });

    it.each([
      ['an unknown kind', { kind: 'rule' }],
      ['a missing connector id', { connector_id: undefined }],
      ['an empty tags array', { metadata: { name: 'Import', tags: [] } }],
      [
        'more than 100 routing tags',
        {
          metadata: {
            name: 'Import',
            routing_tags: Array.from({ length: 101 }, (_, i) => `t${i}`),
          },
        },
      ],
      ['a name over 256 characters', { metadata: { name: 'x'.repeat(257) } }],
    ])('rejects %s', (_, overrides) => {
      const { attributes } = createImportConfigDocument(overrides);

      expect(() => create.validate(attributes)).toThrow();
    });
  });
});
