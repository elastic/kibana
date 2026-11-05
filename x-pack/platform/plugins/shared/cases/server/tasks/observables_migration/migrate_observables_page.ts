/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ISavedObjectsRepository, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_ATTACHMENT_SAVED_OBJECT } from '../../../common/constants';
import type { UnifiedAttachmentAttributes } from '../../../common/types/domain/attachment/v2';
import {
  buildCaseReferences,
  buildObservableAttachmentAttributes,
  deriveObservableId,
} from '../../client/cases/observables_storage';
import {
  OBSERVABLES_MIGRATION_BULK_CREATE_CONCURRENCY,
  OBSERVABLES_MIGRATION_BULK_CREATE_SIZE,
} from './constants';
import type { LegacyCase } from './scan_cases';
import type { ObservablesMigrationCounts } from './types';
import { EMPTY_COUNTS } from './types';

/** A legacy observable has no recorded author. */
const NO_USER = { email: null, full_name: null, username: null };

interface BuiltAttachments {
  objects: Array<SavedObjectsBulkCreateObject<UnifiedAttachmentAttributes>>;
  collapsed: number;
  invalid: number;
}

export interface MigratePageResult {
  counts: ObservablesMigrationCounts;
  failedCaseIds: string[];
  failureReasons: string[];
}

/**
 * One attachment per distinct type key and value of a case. The derived id makes a rerun
 * conflict instead of creating a second copy; the old id is kept as `legacyId`.
 */
export const buildObservableAttachments = (
  { id: caseId, owner, namespaces, observables }: LegacyCase,
  migratedAt: string
): BuiltAttachments => {
  const references = buildCaseReferences(caseId);
  const seen = new Set<string>();
  const objects: BuiltAttachments['objects'] = [];
  let collapsed = 0;
  let invalid = 0;

  for (const { id: legacyId, typeKey, value, description, createdAt, updatedAt } of observables) {
    const id = typeKey && value ? deriveObservableId({ caseId, typeKey, value }) : undefined;

    if (id == null || !typeKey || !value) {
      invalid += 1;
    } else if (seen.has(id)) {
      collapsed += 1;
    } else {
      seen.add(id);
      objects.push({
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        id,
        attributes: buildObservableAttachmentAttributes({
          observable: { typeKey, value, description: description ?? null },
          legacyId: legacyId ?? undefined,
          owner,
          createdAt: createdAt ?? migratedAt,
          updatedAt: updatedAt ?? null,
          createdBy: NO_USER,
        }),
        references,
        initialNamespaces: namespaces,
      });
    }
  }

  return { objects, collapsed, invalid };
};

/** Creates the observable attachments of a page of cases. It never writes the cases. */
export const migrateObservablesPage = async ({
  repo,
  cases,
  bulkCreateSize = OBSERVABLES_MIGRATION_BULK_CREATE_SIZE,
  concurrency = OBSERVABLES_MIGRATION_BULK_CREATE_CONCURRENCY,
}: {
  repo: ISavedObjectsRepository;
  cases: LegacyCase[];
  bulkCreateSize?: number;
  concurrency?: number;
}): Promise<MigratePageResult> => {
  const migratedAt = new Date().toISOString();
  const objects: BuiltAttachments['objects'] = [];
  const caseIdOfObject: string[] = [];
  const failedCaseIds = new Set<string>();
  let observables = 0;
  let collapsed = 0;
  let invalid = 0;

  for (const legacyCase of cases) {
    const built = buildObservableAttachments(legacyCase, migratedAt);
    observables += legacyCase.observables.length;
    collapsed += built.collapsed;
    invalid += built.invalid;
    if (built.invalid > 0) {
      failedCaseIds.add(legacyCase.id);
    }
    for (const object of built.objects) {
      objects.push(object);
      caseIdOfObject.push(legacyCase.id);
    }
  }

  const starts: number[] = [];
  for (let start = 0; start < objects.length; start += bulkCreateSize) {
    starts.push(start);
  }

  const chunkResults = await pMap(
    starts,
    async (start) => {
      const { saved_objects: results } = await repo.bulkCreate(
        objects.slice(start, start + bulkCreateSize),
        { refresh: false }
      );
      return results.map((result, index) => ({ result, caseId: caseIdOfObject[start + index] }));
    },
    { concurrency }
  );

  let created = 0;
  let alreadyPresent = 0;
  let failed = invalid;
  const failureReasons = new Set<string>(
    invalid > 0 ? ['observable without type key or value'] : []
  );

  for (const { result, caseId } of chunkResults.flat()) {
    if (!isSavedObjectErrorResult(result)) {
      created += 1;
    } else if (result.error.statusCode === 409) {
      alreadyPresent += 1;
    } else {
      failed += 1;
      failedCaseIds.add(caseId);
      failureReasons.add(result.error.message);
    }
  }

  return {
    counts: {
      ...EMPTY_COUNTS,
      cases: cases.length,
      observables,
      created,
      alreadyPresent,
      collapsed,
      failed,
    },
    failedCaseIds: [...failedCaseIds],
    failureReasons: [...failureReasons],
  };
};
