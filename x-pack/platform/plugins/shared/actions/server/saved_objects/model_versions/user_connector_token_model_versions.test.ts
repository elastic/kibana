/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsType,
  SavedObjectsFullModelVersion,
} from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { userConnectorTokenMappings } from '../mappings';
import {
  userConnectorTokenEncryptedRegistrationV1,
  userConnectorTokenEncryptedRegistrationV2,
} from '../user_connector_token_encryption';
import { userConnectorTokenModelVersions } from './user_connector_token_model_versions';

const userConnectorTokenType: SavedObjectsType = {
  name: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: userConnectorTokenMappings,
  modelVersions: userConnectorTokenModelVersions,
};

const createV1TokenDocument = (): SavedObject => ({
  id: 'token-1',
  type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  attributes: {
    profileUid: 'profile-1',
    connectorId: 'connector-1',
    credentialType: 'access_token',
    credentials: '{"accessToken":"encrypted-value"}',
    expiresAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  references: [],
});

describe('userConnectorTokenModelVersions', () => {
  describe('encryption registrations', () => {
    it('includes userCloudId in V2 AAD but not in V1', () => {
      expect(userConnectorTokenEncryptedRegistrationV1.attributesToIncludeInAAD).not.toContain(
        'userCloudId'
      );
      expect(userConnectorTokenEncryptedRegistrationV2.attributesToIncludeInAAD).toContain(
        'userCloudId'
      );
    });
  });

  describe('version 2', () => {
    const version2 = userConnectorTokenModelVersions['2'] as SavedObjectsFullModelVersion;

    it('only adds the userCloudId mappings and does not re-encrypt existing documents', () => {
      expect(version2.changes).toHaveLength(1);

      const mappingsChange = version2.changes.find((change) => change.type === 'mappings_addition');
      expect(mappingsChange).toBeDefined();
      if (mappingsChange?.type === 'mappings_addition') {
        expect(mappingsChange.addedMappings).toEqual({
          userCloudId: { type: 'keyword', ignore_above: 1024 },
        });
      }

      expect(version2.changes.some((change) => change.type === 'data_backfill')).toBe(false);
    });
  });

  describe('v1 to v2 migration', () => {
    it('preserves a pre-existing V1 token without populating userCloudId', () => {
      const migrator = createModelVersionTestMigrator({ type: userConnectorTokenType });
      const document = createV1TokenDocument();

      const migrated = migrator.migrate({
        document,
        fromVersion: 1,
        toVersion: 2,
      });

      expect(migrated.attributes).toEqual(document.attributes);
      expect(migrated.attributes).not.toHaveProperty('userCloudId');
    });
  });
});
