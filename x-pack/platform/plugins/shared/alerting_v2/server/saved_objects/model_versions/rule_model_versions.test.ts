/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { RULE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { ruleMappings } from '../rule_mappings';
import { ruleModelVersions } from './rule_model_versions';

const ruleType: SavedObjectsType = {
  name: RULE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: ruleMappings,
  modelVersions: ruleModelVersions,
};

const createV5RuleDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'rule-1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    kind: 'alert',
    metadata: { name: 'test-rule', description: 'a test alerting v2 rule', version: 1 },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    recovery_strategy: 'no_breach',
    query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    grouping: { fields: ['host.name'] },
    enabled: true,
    createdBy: 'author_profile_uid',
    updatedBy: 'editor_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

describe('ruleModelVersions', () => {
  describe('v5 to v6 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: ruleType });

    const migrate = (document: SavedObject) =>
      migrator.migrate({ document, fromVersion: 5, toVersion: 6 }).attributes as Record<
        string,
        unknown
      >;

    it('wraps a string createdBy profile UID into the structured actor', () => {
      expect(migrate(createV5RuleDocument()).createdBy).toEqual({
        profile_uid: 'author_profile_uid',
      });
    });

    it('wraps a string updatedBy profile UID into the structured actor', () => {
      expect(migrate(createV5RuleDocument()).updatedBy).toEqual({
        profile_uid: 'editor_profile_uid',
      });
    });

    it('keeps a null createdBy null for unattributed writes', () => {
      expect(migrate(createV5RuleDocument({ createdBy: null })).createdBy).toBeNull();
    });

    it('keeps a null updatedBy null for unattributed writes', () => {
      expect(migrate(createV5RuleDocument({ updatedBy: null })).updatedBy).toBeNull();
    });

    it('migrates createdBy independently of a null updatedBy', () => {
      const attributes = migrate(createV5RuleDocument({ updatedBy: null }));
      expect(attributes.createdBy).toEqual({ profile_uid: 'author_profile_uid' });
      expect(attributes.updatedBy).toBeNull();
    });

    it('leaves an already-structured actor untouched', () => {
      const document = createV5RuleDocument({ createdBy: { profile_uid: 'already_migrated' } });
      expect(migrate(document).createdBy).toEqual({ profile_uid: 'already_migrated' });
    });

    it('does not backfill an actor when the attribute is absent', () => {
      expect(migrate(createV5RuleDocument({ createdBy: undefined })).createdBy).toBeUndefined();
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV5RuleDocument();
      expect(migrate(document)).toEqual({
        ...(document.attributes as Record<string, unknown>),
        createdBy: { profile_uid: 'author_profile_uid' },
        updatedBy: { profile_uid: 'editor_profile_uid' },
      });
    });
  });

  // The actor is a nested object, so these pin that `unknowns: 'ignore'` on the
  // attributes schema reaches it. It does: config-schema maps the option to Joi's
  // `stripUnknown`, which cascades to children that do not override it. Without
  // that, a v6 node could not read a rule whose actor a newer node had extended.
  describe('v6 forward compatibility', () => {
    const forwardCompatibility = ruleModelVersions['6']?.schemas
      ?.forwardCompatibility as ObjectType;

    const validate = (attributes: Record<string, unknown>) =>
      forwardCompatibility.validate(attributes) as Record<string, unknown>;

    const v6Attributes = (actor: Record<string, unknown>) => ({
      ...(createV5RuleDocument().attributes as Record<string, unknown>),
      createdBy: actor,
      updatedBy: null,
    });

    it('drops identity fields a newer node added to the actor', () => {
      expect(
        validate(v6Attributes({ profile_uid: 'author_profile_uid', username: 'author' })).createdBy
      ).toEqual({ profile_uid: 'author_profile_uid' });
    });

    it('keeps the actor intact when it carries no extra fields', () => {
      expect(validate(v6Attributes({ profile_uid: 'author_profile_uid' })).createdBy).toEqual({
        profile_uid: 'author_profile_uid',
      });
    });
  });
});
