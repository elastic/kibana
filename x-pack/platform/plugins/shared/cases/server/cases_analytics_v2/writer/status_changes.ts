/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { CaseStatuses, UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { RECONCILIATION_NAMESPACES_ALL } from '../reconciliation/constants';
import type { CaseStatusChange } from './status_history';

const PER_PAGE = 1000;

interface StatusUserActionAttributes {
  created_at: string;
  payload?: { status?: unknown };
}

const CASE_STATUS_VALUES: ReadonlySet<unknown> = new Set(Object.values(CaseStatuses));

const isCaseStatus = (value: unknown): value is CaseStatuses => CASE_STATUS_VALUES.has(value);

/**
 * Reads the status-change user actions of the cases, grouped by case id. A case with no status change has an empty list.
 */
export const findCaseStatusChanges = async ({
  savedObjectsClient,
  caseIds,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
}): Promise<Map<string, CaseStatusChange[]>> => {
  const statusChangesByCaseId = new Map<string, CaseStatusChange[]>(
    caseIds.map((caseId) => [caseId, []])
  );

  if (caseIds.length === 0) {
    return statusChangesByCaseId;
  }

  const finder = savedObjectsClient.createPointInTimeFinder<StatusUserActionAttributes>({
    type: CASE_USER_ACTION_SAVED_OBJECT,
    // The unscoped internal client reads only the default space without this option.
    namespaces: [...RECONCILIATION_NAMESPACES_ALL],
    hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
    hasReferenceOperator: 'OR',
    filter: nodeBuilder.and([
      nodeBuilder.is(`${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type`, UserActionTypes.status),
      nodeBuilder.is(
        `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.action`,
        UserActionActions.update
      ),
    ]),
    sortField: 'created_at',
    sortOrder: 'asc',
    perPage: PER_PAGE,
  });

  try {
    for await (const page of finder.find()) {
      for (const { attributes, references } of page.saved_objects) {
        const status = attributes.payload?.status;
        const caseId = references.find(({ type }) => type === CASE_SAVED_OBJECT)?.id;
        const statusChanges = caseId == null ? undefined : statusChangesByCaseId.get(caseId);

        if (statusChanges != null && isCaseStatus(status)) {
          statusChanges.push({ status, timestamp: attributes.created_at });
        }
      }
    }
  } finally {
    await finder.close();
  }

  return statusChangesByCaseId;
};
