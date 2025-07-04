/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsMigrationLogger } from '@kbn/core/server';
import { migrationMocks } from '@kbn/core/server/mocks';
import { mockCaseComments } from '../../mocks';
import { MIN_COMMENTS_DEFERRED_KIBANA_VERSION } from './constants';
import {
  isDeferredMigration,
  isUserCommentSO,
  logError,
  isPersistableStateAttachmentSO,
} from './utils';

describe('migration utils', () => {
  const context = migrationMocks.createContext();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logError', () => {
    it('logs an error', () => {
      const log = context.log as jest.Mocked<SavedObjectsMigrationLogger>;

      logError({
        id: '1',
        context,
        error: new Error('an error'),
        docType: 'a document',
        docKey: 'key',
      });

      expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to migrate a document with doc id: 1 version: 8.0.0 error: an error",
        Object {
          "migrations": Object {
            "key": Object {
              "id": "1",
            },
          },
        },
      ]
    `);
    });
  });

  describe('isDeferredMigration', () => {
    it('should mark the migration as deferred if the migration version is greater than the Kibana version', () => {
      expect(isDeferredMigration(MIN_COMMENTS_DEFERRED_KIBANA_VERSION, '8.10.0')).toBe(true);
    });

    it('should mark the migration as not deferred if the migration version is smaller than the Kibana version', () => {
      expect(isDeferredMigration(MIN_COMMENTS_DEFERRED_KIBANA_VERSION, '8.8.0')).toBe(false);
    });

    it('should mark the migration as deferred if the migration version is equal to the Kibana version', () => {
      expect(isDeferredMigration(MIN_COMMENTS_DEFERRED_KIBANA_VERSION, '8.9.0')).toBe(true);
    });

    it('should return false if the Kibana version is not a valid semver', () => {
      expect(isDeferredMigration('invalid', '8.8.0')).toBe(false);
    });

    it('should return false if the migration version is not a valid semver', () => {
      expect(isDeferredMigration(MIN_COMMENTS_DEFERRED_KIBANA_VERSION, 'invalid')).toBe(false);
    });
  });

  describe('isUserCommentSO', () => {
    it('should return true if it is a user comment SO', () => {
      expect(isUserCommentSO(mockCaseComments[0])).toBe(true);
    });

    it('should return false if it is not a user comment SO', () => {
      expect(isUserCommentSO(mockCaseComments[3])).toBe(false);
    });
  });

  describe('isPersistableStateAttachmentSO', () => {
    it('should return true if it is a persistable attachment SO', () => {
      expect(isPersistableStateAttachmentSO(mockCaseComments[6])).toBe(true);
    });

    it('should return false if it is not a persistable attachment SO', () => {
      expect(isPersistableStateAttachmentSO(mockCaseComments[0])).toBe(false);
    });
  });
});
