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
});
