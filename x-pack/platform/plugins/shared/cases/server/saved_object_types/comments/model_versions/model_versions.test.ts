/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelChange,
  SavedObjectsModelDataBackfillChange,
  SavedObjectsModelMappingsAdditionChange,
  SavedObjectModelTransformationContext,
} from '@kbn/core-saved-objects-server';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { AttachmentPersistedAttributes } from '../../../common/types/attachments_v1';
import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';

const isMappingsAddition = (
  change: SavedObjectsModelChange
): change is SavedObjectsModelMappingsAdditionChange => change.type === 'mappings_addition';

const isDataBackfill = (
  change: SavedObjectsModelChange
): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill';

// Pre-mv2 fixture: caseId is intentionally omitted because the backfill supplies it.
const baseAttrs: AttachmentPersistedAttributes = {
  type: 'user',
  comment: 'hello',
  owner: 'cases',
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'u', full_name: null, email: null, profile_uid: undefined },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const createFakeContext = (): SavedObjectModelTransformationContext =>
  ({
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    modelVersion: 2,
    namespaceType: 'multiple-isolated',
  } as unknown as SavedObjectModelTransformationContext);

describe('cases-comments model versions', () => {
  describe('version 1', () => {
    it('adds the eventId mapping', () => {
      const addition = modelVersion1.changes.find(isMappingsAddition);
      expect(addition?.addedMappings).toEqual({ eventId: { type: 'keyword' } });
    });
  });

  describe('version 2', () => {
    it('adds the caseId top-level keyword mapping', () => {
      const addition = modelVersion2.changes.find(isMappingsAddition);
      expect(addition?.addedMappings).toEqual({ caseId: { type: 'keyword' } });
    });

    describe('data_backfill', () => {
      const getBackfillFn = (): SavedObjectModelDataBackfillFn<
        AttachmentPersistedAttributes,
        Pick<AttachmentPersistedAttributes, 'caseId'>
      > => {
        const change = modelVersion2.changes.find(isDataBackfill);
        if (!change) throw new Error('expected data_backfill change');
        return change.backfillFn as SavedObjectModelDataBackfillFn<
          AttachmentPersistedAttributes,
          Pick<AttachmentPersistedAttributes, 'caseId'>
        >;
      };

      it('derives caseId from the cases SO reference', () => {
        const backfillFn = getBackfillFn();
        const result = backfillFn(
          {
            id: 'comment-1',
            type: 'cases-comments',
            attributes: baseAttrs,
            references: [
              { type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: 'case-1' },
            ],
          },
          createFakeContext()
        );
        expect(result).toEqual({ attributes: { caseId: 'case-1' } });
      });

      it('returns no attribute changes when the doc already has caseId', () => {
        const backfillFn = getBackfillFn();
        const result = backfillFn(
          {
            id: 'comment-1',
            type: 'cases-comments',
            attributes: { ...baseAttrs, caseId: 'already-set' },
            references: [
              { type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: 'case-1' },
            ],
          },
          createFakeContext()
        );
        expect(result).toEqual({ attributes: {} });
      });

      it('warns and returns no attribute changes when neither caseId nor a cases reference is available', () => {
        const backfillFn = getBackfillFn();
        const context = createFakeContext();
        const result = backfillFn(
          { id: 'comment-1', type: 'cases-comments', attributes: baseAttrs, references: [] },
          context
        );
        expect(result).toEqual({ attributes: {} });
        expect(context.log.warn).toHaveBeenCalledWith(
          expect.stringMatching(/missing parent cases reference/)
        );
      });
    });
  });
});
