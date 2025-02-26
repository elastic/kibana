/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createCaseSavedObjectType } from './cases';
import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { loggerMock } from '@kbn/logging-mocks';
import { createCaseSavedObjectResponse } from '../../services/test_utils';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { SavedObject } from '@kbn/core/server';

// TODO: Properly test migrator 

const mockLogger = loggerMock.create();
const mockCoreSetup = coreMock.createSetup();
const caseSavedObjectType = createCaseSavedObjectType(mockCoreSetup, mockLogger);

describe('caseSavedObjectType model version transformations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: caseSavedObjectType });
  });

  describe('Model version 1', () => {
    const version1Fields = ['customFields'];
    it('by default does not add the new fields to the object', () => {
      const caseObj = createCaseSavedObjectResponse();

      const migrated = migrator.migrate({
        document: caseObj,
        fromVersion: 0,
        toVersion: 1,
      });

      version1Fields.forEach((version1Field) => {
        expect(migrated.attributes).not.toHaveProperty(version1Field);
      });
    });
  });

  describe('Model version 2', () => {
    const version2Fields = ['incremental_id'];
    let v1CaseObj: SavedObject<CasePersistedAttributes>;

    beforeEach(() => {
      v1CaseObj = createCaseSavedObjectResponse();
      v1CaseObj.attributes.customFields = undefined;
    });

    it('by default does not add the new fields to the object', () => {
      const migrated = migrator.migrate({
        document: v1CaseObj,
        fromVersion: 1,
        toVersion: 2,
      });

      expect(migrated.attributes).not.toHaveProperty(version2Fields);
    });

    // it('properly removes the new field when reverting from v2 to v1', () => {
    //   const v2Migrated = migrator.migrate<CasePersistedAttributes, CasePersistedAttributes>({
    //     document: v1CaseObj,
    //     fromVersion: 1,
    //     toVersion: 2,
    //   });
    //   v2Migrated.attributes.incremental_id = undefined;

    //   const reverted = migrator.migrate({
    //     document: v2Migrated,
    //     fromVersion: 2,
    //     toVersion: 1,
    //   });

    //   expect(reverted.attributes).toMatchInlineSnapshot();
    // });
  });
});
