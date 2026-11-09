/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import type { CaseAccess } from '../../common/types/domain';
import { CaseAccessMode } from '../../common/types/domain';

interface CaseIdWithNamespace {
  caseId: string;
  /**
   * The concrete space of the case. Required when the saved objects client is
   * not scoped to the case's space (the reconciliation runners walk all
   * spaces); omitted for request-scoped callers.
   */
  namespace?: string;
}

/**
 * Returns the subset of the given case ids whose case is restricted. Used by
 * the analytics mirrors and the reconciliation runners to keep restricted
 * cases (and their activity and attachment documents) out of the analytics
 * indices. A case that cannot be fetched is treated as restricted — failing
 * closed never leaks; reconciliation re-walks recent documents and repairs
 * skips caused by transient fetch errors.
 */
export const getRestrictedCaseIds = async (
  savedObjectsClient: SavedObjectsClientContract,
  cases: CaseIdWithNamespace[]
): Promise<Set<string>> => {
  const uniqueCases = new Map<string, CaseIdWithNamespace>();
  for (const theCase of cases) {
    uniqueCases.set(`${theCase.namespace ?? ''}:${theCase.caseId}`, theCase);
  }

  if (uniqueCases.size === 0) {
    return new Set();
  }

  const { saved_objects: caseSOs } = await savedObjectsClient.bulkGet<{ access?: CaseAccess }>(
    Array.from(uniqueCases.values()).map(({ caseId, namespace }) => ({
      type: CASE_SAVED_OBJECT,
      id: caseId,
      fields: ['access'],
      ...(namespace !== undefined ? { namespaces: [namespace] } : {}),
    }))
  );

  const restricted = new Set<string>();
  for (const so of caseSOs) {
    if (isSavedObjectErrorResult(so) || so.attributes?.access?.mode === CaseAccessMode.RESTRICTED) {
      restricted.add(so.id);
    }
  }

  return restricted;
};

/**
 * Extracts the parent case id from a case child saved object (user action or
 * attachment) via its `cases` reference.
 */
export const getParentCaseId = (so: Pick<SavedObject, 'references'>): string | undefined =>
  so.references.find((ref) => ref.type === CASE_SAVED_OBJECT)?.id;
