/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { caseConfigureSavedObjectType } from './configure';

const createConfigureDocument = (
  attributes: Record<string, unknown>
): SavedObject<Record<string, unknown>> => ({
  id: 'configure-1',
  type: CASE_CONFIGURE_SAVED_OBJECT,
  attributes: {
    connector: { name: 'none', type: '.none', fields: null },
    closure_type: 'close-by-user',
    created_at: '2026-09-01T00:00:00.000Z',
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_at: null,
    updated_by: null,
    ...attributes,
  },
  references: [],
});

describe('caseConfigureSavedObjectType model version transformations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: caseConfigureSavedObjectType });
  });

  describe('Model version 2 to 3', () => {
    describe('when extractObservables is missing', () => {
      it.each([
        [SECURITY_SOLUTION_OWNER, true],
        [OBSERVABILITY_OWNER, false],
        [GENERAL_CASES_OWNER, false],
      ])('backfills the owner default for owner "%s"', (owner, expected) => {
        const migrated = migrator.migrate<Record<string, unknown>, Record<string, unknown>>({
          document: createConfigureDocument({ owner }),
          fromVersion: 2,
          toVersion: 3,
        });

        expect(migrated.attributes.extractObservables).toBe(expected);
      });
    });

    describe('when extractObservables is already set', () => {
      it('keeps false for the security solution owner', () => {
        const migrated = migrator.migrate<Record<string, unknown>, Record<string, unknown>>({
          document: createConfigureDocument({
            owner: SECURITY_SOLUTION_OWNER,
            extractObservables: false,
          }),
          fromVersion: 2,
          toVersion: 3,
        });

        expect(migrated.attributes.extractObservables).toBe(false);
      });

      it('keeps true for the general cases owner, whose default is false', () => {
        const migrated = migrator.migrate<Record<string, unknown>, Record<string, unknown>>({
          document: createConfigureDocument({
            owner: GENERAL_CASES_OWNER,
            extractObservables: true,
          }),
          fromVersion: 2,
          toVersion: 3,
        });

        expect(migrated.attributes.extractObservables).toBe(true);
      });
    });
  });
});
