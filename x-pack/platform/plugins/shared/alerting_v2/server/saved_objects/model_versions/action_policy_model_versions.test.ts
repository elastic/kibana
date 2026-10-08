/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { actionPolicyMappings } from '../action_policy_mappings';
import { actionPolicyModelVersions } from './action_policy_model_versions';

const actionPolicyType: SavedObjectsType = {
  name: ACTION_POLICY_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: actionPolicyMappings,
  modelVersions: actionPolicyModelVersions,
};

const createV1PolicyDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'policy-1',
  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'test-policy',
    description: 'A test action policy',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: null,
    groupBy: null,
    tags: null,
    groupingMode: null,
    throttle: null,
    snoozedUntil: null,
    auth: {
      apiKey: 'plaintext-api-key',
      owner: 'elastic',
      createdByUser: true,
    },
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

const createV2PolicyDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'policy-1',
  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'test-policy',
    description: 'A test action policy',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: 'rule.tags : "production"',
    groupBy: null,
    tags: null,
    groupingMode: null,
    throttle: null,
    snoozedUntil: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: true,
    auth: {
      owner: 'elastic',
      createdByUser: true,
    },
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

const createV3PolicyDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'policy-1',
  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'test-policy',
    description: 'A test action policy',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: { expression: 'tags : "production"' },
    groupBy: null,
    tags: null,
    groupingMode: null,
    throttle: null,
    snoozedUntil: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: true,
    auth: {
      owner: 'elastic',
      createdByUser: true,
    },
    createdBy: 'author_profile_uid',
    updatedBy: 'editor_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

const createV4PolicyDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'policy-1',
  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'test-policy',
    description: 'A test action policy',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: { expression: 'tags : "production"' },
    groupBy: null,
    tags: null,
    groupingMode: 'per_episode',
    throttle: { strategy: 'on_status_change' },
    snoozedUntil: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: true,
    auth: {
      owner: 'elastic',
      createdByUser: true,
    },
    createdBy: { profile_uid: 'author_profile_uid' },
    updatedBy: { profile_uid: 'editor_profile_uid' },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

const createV5PolicyDocument = (overrides: Record<string, unknown> = {}): SavedObject => ({
  id: 'policy-1',
  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'test-policy',
    description: 'A test action policy',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: { expression: 'tags : "production"' },
    groupBy: ['host.name'],
    tags: null,
    groupingMode: 'per_field',
    throttle: { strategy: 'time_interval', interval: '5m' },
    snoozedUntil: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: true,
    auth: {
      owner: 'elastic',
      createdByUser: true,
    },
    createdBy: { profile_uid: 'author_profile_uid' },
    updatedBy: { profile_uid: 'editor_profile_uid' },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

describe('actionPolicyModelVersions', () => {
  describe('v1 to v2 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    it('backfills apiKeyOwner from auth.owner', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.apiKeyOwner).toBe('elastic');
    });

    it('backfills apiKeyCreatedByUser from auth.createdByUser', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.apiKeyCreatedByUser).toBe(true);
    });

    it('removes auth.apiKey (the plaintext secret) from the auth container', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      const auth = attrs.auth as Record<string, unknown>;
      expect(auth).not.toHaveProperty('apiKey');
    });

    it('keeps the auth container (owner/createdByUser) for rollback compatibility', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.auth).toEqual({ owner: 'elastic', createdByUser: true });
    });

    it('does not populate the flat apiKey field', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      expect(migrated.attributes).not.toHaveProperty('apiKey');
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV1PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.name).toBe('test-policy');
      expect(attrs.description).toBe('A test action policy');
      expect(attrs.enabled).toBe(true);
      expect(attrs.destinations).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
      expect(attrs.createdBy).toBe('elastic');
      expect(attrs.updatedBy).toBe('elastic');
      expect(attrs.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(attrs.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('handles a missing auth object without throwing', () => {
      const document = createV1PolicyDocument({ auth: undefined });
      expect(() => migrator.migrate({ document, fromVersion: 1, toVersion: 2 })).not.toThrow();
    });

    it('falls back to empty owner and false createdByUser when auth is missing', () => {
      const document = createV1PolicyDocument({ auth: undefined });
      const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.apiKeyOwner).toBe('');
      expect(attrs.apiKeyCreatedByUser).toBe(false);
    });
  });

  describe('v2 to v3 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    it('wraps a raw KQL matcher into the structured matcher expression', () => {
      const document = createV2PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 2, toVersion: 3 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.matcher).toEqual({ expression: 'rule.tags : "production"' });
    });

    it('leaves a null matcher (catch-all policy) untouched', () => {
      const document = createV2PolicyDocument({ matcher: null });
      const migrated = migrator.migrate({ document, fromVersion: 2, toVersion: 3 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.matcher).toBeNull();
    });

    it('does not backfill a matcher when the document has none', () => {
      const document = createV2PolicyDocument({ matcher: undefined });
      const migrated = migrator.migrate({ document, fromVersion: 2, toVersion: 3 });
      const attrs = migrated.attributes as Record<string, unknown>;
      expect(attrs.matcher).toBeUndefined();
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV2PolicyDocument();
      const migrated = migrator.migrate({ document, fromVersion: 2, toVersion: 3 });
      expect(migrated.attributes).toEqual({
        ...(document.attributes as Record<string, unknown>),
        matcher: { expression: 'rule.tags : "production"' },
      });
    });
  });

  describe('v3 to v4 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    const migrate = (document: SavedObject) =>
      migrator.migrate({ document, fromVersion: 3, toVersion: 4 }).attributes as Record<
        string,
        unknown
      >;

    it('wraps a string createdBy profile UID into the structured actor', () => {
      expect(migrate(createV3PolicyDocument()).createdBy).toEqual({
        profile_uid: 'author_profile_uid',
      });
    });

    it('wraps a string updatedBy profile UID into the structured actor', () => {
      expect(migrate(createV3PolicyDocument()).updatedBy).toEqual({
        profile_uid: 'editor_profile_uid',
      });
    });

    it('keeps a null createdBy null for unattributed writes', () => {
      expect(migrate(createV3PolicyDocument({ createdBy: null })).createdBy).toBeNull();
    });

    it('keeps a null updatedBy null for unattributed writes', () => {
      expect(migrate(createV3PolicyDocument({ updatedBy: null })).updatedBy).toBeNull();
    });

    it('leaves an already-structured actor untouched', () => {
      const document = createV3PolicyDocument({ createdBy: { profile_uid: 'already_migrated' } });
      expect(migrate(document).createdBy).toEqual({ profile_uid: 'already_migrated' });
    });

    it('does not backfill an actor when the attribute is absent', () => {
      expect(migrate(createV3PolicyDocument({ createdBy: undefined })).createdBy).toBeUndefined();
    });

    it('leaves the stored API key ownership attributes untouched', () => {
      const attributes = migrate(createV3PolicyDocument());
      expect(attributes.apiKeyOwner).toBe('elastic');
      expect(attributes.apiKeyCreatedByUser).toBe(true);
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV3PolicyDocument();
      expect(migrate(document)).toEqual({
        ...(document.attributes as Record<string, unknown>),
        createdBy: { profile_uid: 'author_profile_uid' },
        updatedBy: { profile_uid: 'editor_profile_uid' },
      });
    });
  });

  describe('v4 to v5 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    const migrate = (document: SavedObject) =>
      migrator.migrate({ document, fromVersion: 4, toVersion: 5 }).attributes as Record<
        string,
        unknown
      >;

    it('renames the per_episode grouping mode to per_alert', () => {
      expect(migrate(createV4PolicyDocument()).groupingMode).toBe('per_alert');
    });

    it('leaves the all grouping mode untouched', () => {
      expect(migrate(createV4PolicyDocument({ groupingMode: 'all' })).groupingMode).toBe('all');
    });

    it('leaves the per_field grouping mode untouched', () => {
      const document = createV4PolicyDocument({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
      });
      expect(migrate(document).groupingMode).toBe('per_field');
    });

    it('keeps a null grouping mode null', () => {
      expect(migrate(createV4PolicyDocument({ groupingMode: null })).groupingMode).toBeNull();
    });

    it('does not backfill a grouping mode when the attribute is absent', () => {
      expect(
        migrate(createV4PolicyDocument({ groupingMode: undefined })).groupingMode
      ).toBeUndefined();
    });

    it('is idempotent for a policy already grouped per_alert', () => {
      expect(migrate(createV4PolicyDocument({ groupingMode: 'per_alert' })).groupingMode).toBe(
        'per_alert'
      );
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV4PolicyDocument();
      expect(migrate(document)).toEqual({
        ...(document.attributes as Record<string, unknown>),
        groupingMode: 'per_alert',
      });
    });
  });

  describe('v5 to v6 migration', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    const migrate = (document: SavedObject) =>
      migrator.migrate({ document, fromVersion: 5, toVersion: 6 }).attributes as Record<
        string,
        unknown
      >;

    it('folds a per_field mode and its fields into one grouping block', () => {
      expect(migrate(createV5PolicyDocument()).grouping).toEqual({
        mode: 'per_field',
        fields: ['host.name'],
      });
    });

    it('folds the all mode into a grouping block with no fields', () => {
      const document = createV5PolicyDocument({ groupingMode: 'all', groupBy: null });
      expect(migrate(document).grouping).toEqual({ mode: 'all' });
    });

    // An explicit mode is kept even when it is the default one, because a write keeps it too.
    it('folds the per_alert mode into a grouping block with no fields', () => {
      const document = createV5PolicyDocument({ groupingMode: 'per_alert', groupBy: null });
      expect(migrate(document).grouping).toEqual({ mode: 'per_alert' });
    });

    it.each([
      ['null', null],
      ['absent', undefined],
      ['the legacy per_episode', 'per_episode'],
    ])('leaves a %s grouping mode with no grouping block', (_label, groupingMode) => {
      const document = createV5PolicyDocument({ groupingMode, groupBy: null });
      expect(migrate(document).grouping).toBeUndefined();
    });

    // `per_field` groups on its fields, so without any it named no behaviour to carry over.
    it.each([
      ['null', null],
      ['an empty array', []],
      ['absent', undefined],
    ])('drops a per_field mode whose fields are %s', (_label, groupBy) => {
      const document = createV5PolicyDocument({ groupingMode: 'per_field', groupBy });
      expect(migrate(document).grouping).toBeUndefined();
    });

    // Fields on a mode that reads none were dead configuration, so they are not carried over.
    it.each([['all'], ['per_alert']])(
      'drops the fields stored against the %s mode, which does not group on them',
      (groupingMode) => {
        const document = createV5PolicyDocument({ groupingMode, groupBy: ['host.name'] });
        expect(migrate(document).grouping).toEqual({ mode: groupingMode });
      }
    );

    it.each([
      ['per_field with fields', { groupingMode: 'per_field', groupBy: ['host.name'] }],
      ['all', { groupingMode: 'all', groupBy: null }],
      ['per_alert', { groupingMode: 'per_alert', groupBy: null }],
    ])('removes the replaced attributes for %s', (_label, overrides) => {
      const attributes = migrate(createV5PolicyDocument(overrides));

      expect(attributes).not.toHaveProperty('groupingMode');
      expect(attributes).not.toHaveProperty('groupBy');
    });

    it('drops a throttle interval the stored strategy does not use', () => {
      const document = createV5PolicyDocument({
        groupingMode: 'per_alert',
        groupBy: null,
        throttle: { strategy: 'on_status_change', interval: '5m' },
      });

      expect(migrate(document).throttle).toEqual({ strategy: 'on_status_change' });
    });

    it('keeps the interval of a strategy that notifies on a schedule', () => {
      expect(migrate(createV5PolicyDocument()).throttle).toEqual({
        strategy: 'time_interval',
        interval: '5m',
      });
    });

    it('clears a throttle that names no strategy', () => {
      const document = createV5PolicyDocument({ throttle: { interval: '5m' } });
      expect(migrate(document).throttle).toBeNull();
    });

    it.each([
      ['null', null],
      ['absent', undefined],
    ])('leaves a %s throttle alone', (_label, throttle) => {
      const document = createV5PolicyDocument({ throttle });
      expect(migrate(document).throttle ?? null).toBeNull();
    });

    it('preserves unrelated attributes unchanged', () => {
      const document = createV5PolicyDocument();
      const { groupingMode, groupBy, ...rest } = document.attributes as Record<string, unknown>;

      expect(migrate(document)).toEqual({
        ...rest,
        grouping: { mode: 'per_field', fields: ['host.name'] },
      });
    });
  });

  // Mirrors the rule check: the actor is nested, and `unknowns: 'ignore'` on the
  // attributes schema has to reach it for a v4 node to read a policy whose actor
  // a newer node extended.
  describe('v4 forward compatibility', () => {
    const forwardCompatibility = actionPolicyModelVersions['4']?.schemas
      ?.forwardCompatibility as ObjectType;

    it('drops identity fields a newer node added to the actor', () => {
      const attributes = forwardCompatibility.validate({
        ...(createV3PolicyDocument().attributes as Record<string, unknown>),
        createdBy: { profile_uid: 'author_profile_uid', username: 'author' },
        updatedBy: null,
      }) as Record<string, unknown>;

      expect(attributes.createdBy).toEqual({ profile_uid: 'author_profile_uid' });
    });
  });
});
