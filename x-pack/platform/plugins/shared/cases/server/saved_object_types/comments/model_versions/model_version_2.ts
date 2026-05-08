/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsFullModelVersion,
} from '@kbn/core-saved-objects-server';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { AttachmentPersistedAttributes } from '../../../common/types/attachments_v1';

/**
 * Adds the top-level `caseId` keyword and backfills it from the parent
 * `cases` SO reference. New writes carry `caseId` via `transformNewComment`.
 */
const backfillFn: SavedObjectModelDataBackfillFn<
  AttachmentPersistedAttributes,
  Pick<AttachmentPersistedAttributes, 'caseId'>
> = (doc, context) => {
  if (doc.attributes.caseId !== undefined) {
    return { attributes: {} };
  }
  const caseId = doc.references?.find((ref) => ref.type === CASE_SAVED_OBJECT)?.id;
  if (!caseId) {
    // Codec keeps `caseId` optional; warn and skip so reads don't break.
    context.log.warn(
      `cases-comments doc ${doc.id} skipped caseId backfill: missing parent ${CASE_SAVED_OBJECT} reference`
    );
    return { attributes: {} };
  }
  return { attributes: { caseId } };
};

export const modelVersion2: SavedObjectsFullModelVersion = {
  changes: [
    { type: 'mappings_addition', addedMappings: { caseId: { type: 'keyword' } } },
    { type: 'data_backfill', backfillFn },
  ],
  schemas: {
    // Identity passthrough; the SO has no per-mv config-schema yet.
    forwardCompatibility: (attrs) => attrs,
    create: schema.object({}, { unknowns: 'allow' }),
  },
};
