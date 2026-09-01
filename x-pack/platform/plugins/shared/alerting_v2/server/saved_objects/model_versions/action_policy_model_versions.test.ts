/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    matcher: null,
    groupBy: null,
    tags: null,
    groupingMode: null,
    throttle: null,
    snoozedUntil: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: true,
    auth: { owner: 'elastic', createdByUser: true },
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
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

    const migrate = (document: SavedObject) =>
      migrator.migrate({ document, fromVersion: 2, toVersion: 3 }).attributes as Record<
        string,
        unknown
      >;

    it('wraps a KQL string matcher into the structured expression shape', () => {
      const attrs = migrate(createV2PolicyDocument({ matcher: 'rule.tags : "prod"' }));
      expect(attrs.matcher).toEqual({ expression: 'rule.tags : "prod"' });
    });

    it('leaves a null matcher untouched', () => {
      const attrs = migrate(createV2PolicyDocument({ matcher: null }));
      expect(attrs.matcher).toBeNull();
    });

    it('leaves a missing matcher untouched', () => {
      const attrs = migrate(createV2PolicyDocument({ matcher: undefined }));
      expect(attrs.matcher).toBeUndefined();
    });

    it('leaves an already-structured matcher untouched', () => {
      const matcher = { tags: ['prod'], expression: 'data.env : "prod"' };
      const attrs = migrate(createV2PolicyDocument({ matcher }));
      expect(attrs.matcher).toEqual(matcher);
    });

    it('preserves unrelated attributes unchanged', () => {
      const attrs = migrate(createV2PolicyDocument({ matcher: 'rule.tags : "prod"' }));
      expect(attrs.name).toBe('test-policy');
      expect(attrs.destinations).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
      expect(attrs.apiKeyOwner).toBe('elastic');
      expect(attrs.apiKeyCreatedByUser).toBe(true);
      expect(attrs.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(attrs.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('v2 forward compatibility', () => {
    const migrator = createModelVersionTestMigrator({ type: actionPolicyType });

    it('accepts a v3 document holding a structured matcher when rolling back to v2', () => {
      const document = createV2PolicyDocument({
        matcher: { tags: ['prod'], expression: 'data.env : "prod"' },
      });

      expect(() => migrator.migrate({ document, fromVersion: 3, toVersion: 2 })).not.toThrow();
    });

    it('still accepts a v2 document holding a KQL string matcher', () => {
      const document = createV2PolicyDocument({ matcher: 'rule.tags : "prod"' });

      expect(() => migrator.migrate({ document, fromVersion: 3, toVersion: 2 })).not.toThrow();
    });
  });
});
