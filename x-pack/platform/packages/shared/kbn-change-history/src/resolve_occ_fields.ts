/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodePrimaryStoreVersion } from './decode_primary_store_version';
import { ChangeHistoryInvalidOccError } from './change_history_invalid_occ_error';
import type { ObjectChange } from './types';

export interface ResolvedOccFields {
  seqNo: number;
  primaryTerm: number;
}

const hasPrimaryStoreVersion = (change: ObjectChange): boolean =>
  typeof change.primaryStoreVersion === 'string' && change.primaryStoreVersion.length > 0;

const hasNumericSeqNo = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

const hasNumericPrimaryTerm = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

/**
 * Resolves Elasticsearch OCC from `ObjectChange` (exactly one wire shape).
 * @throws ChangeHistoryInvalidOccError when both or neither branch is supplied.
 */
export const resolveOccFields = (change: ObjectChange): ResolvedOccFields => {
  const usesOpaque = hasPrimaryStoreVersion(change);
  const usesNumeric = change.seqNo !== undefined || change.primaryTerm !== undefined;

  if (usesOpaque && usesNumeric) {
    throw new ChangeHistoryInvalidOccError(
      'ObjectChange must not set both primaryStoreVersion and seqNo/primaryTerm'
    );
  }

  if (usesOpaque) {
    return decodePrimaryStoreVersion(change.primaryStoreVersion!);
  }

  if (hasNumericSeqNo(change.seqNo) && hasNumericPrimaryTerm(change.primaryTerm)) {
    return { seqNo: change.seqNo, primaryTerm: change.primaryTerm };
  }

  throw new ChangeHistoryInvalidOccError(
    'ObjectChange must set primaryStoreVersion or both seqNo and primaryTerm from the successful primary write'
  );
};
