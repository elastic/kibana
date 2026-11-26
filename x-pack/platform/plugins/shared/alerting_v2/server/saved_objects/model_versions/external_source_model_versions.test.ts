/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { EXTERNAL_SOURCE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { externalSourceMappings } from '../external_source_mappings';
import { externalSourceModelVersions } from './external_source_model_versions';

const externalSourceType: SavedObjectsType = {
  name: EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: externalSourceMappings,
  modelVersions: externalSourceModelVersions,
};

const createExternalSourceDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'import-1',
  type: EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
  attributes: {
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
    createdBy: { profile_uid: 'u_1' },
    updatedBy: { profile_uid: 'u_1' },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  },
  references: [{ name: 'connector', type: 'action', id: 'connector-1' }],
});

describe('externalSourceModelVersions', () => {
  const migrator = createModelVersionTestMigrator({ type: externalSourceType });

  it('defines model version 1 with no changes', () => {
    expect(Object.keys(externalSourceModelVersions)).toEqual(['1']);
    expect(externalSourceModelVersions['1']).toMatchObject({ changes: [] });
  });

  it('keeps the document and its connector reference unchanged at version 1', () => {
    const document = createExternalSourceDocument();

    const migrated = migrator.migrate({ document, fromVersion: 0, toVersion: 1 });

    expect(migrated.attributes).toEqual(document.attributes);
    expect(migrated.references).toEqual(document.references);
  });

  it('drops attributes it does not know when read by an older version', () => {
    const forwardCompatibility = externalSourceModelVersions['1']?.schemas
      ?.forwardCompatibility as ObjectType;
    const { attributes } = createExternalSourceDocument({ added_by_a_newer_version: 'value' });

    expect(forwardCompatibility.validate(attributes)).not.toHaveProperty(
      'added_by_a_newer_version'
    );
  });

  describe('create schema', () => {
    const create = externalSourceModelVersions['1']?.schemas?.create as ObjectType;

    it('accepts a valid import', () => {
      const { attributes } = createExternalSourceDocument();

      expect(() => create.validate(attributes)).not.toThrow();
    });

    it('accepts an import with only a name in its metadata', () => {
      const { attributes } = createExternalSourceDocument({ metadata: { name: 'Minimal' } });

      expect(() => create.validate(attributes)).not.toThrow();
    });

    it.each([
      ['a type over 256 characters', { type: 'a'.repeat(257) }],
      ['a missing type', { type: undefined }],
      ['an unknown kind', { kind: 'rule' }],
      ['a missing connector id', { connector_id: undefined }],
      ['a missing version', { version: undefined }],
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
      const { attributes } = createExternalSourceDocument(overrides);

      expect(() => create.validate(attributes)).toThrow();
    });
  });
});
