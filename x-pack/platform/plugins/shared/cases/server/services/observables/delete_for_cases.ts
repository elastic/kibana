/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';

/** How many observables one page of a case delete removes. */
export const OBSERVABLES_DELETE_PAGE_SIZE = 1_000;

const RAW_ID_PREFIX = `${CASE_OBSERVABLE_SAVED_OBJECT}:`;

/**
 * Deletes every `cases-observables` object of the cases, a page at a time, and returns how many
 * it deleted. The cases live in `namespace`. A scoped client deletes in its own space; an internal
 * client needs `isInternalClient` so the namespace is passed to the delete.
 */
export const deleteObservablesOfCases = async ({
  savedObjectsClient,
  caseIds,
  namespace,
  isInternalClient = false,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
  namespace: string;
  isInternalClient?: boolean;
  logger: Logger;
}): Promise<number> => {
  let deleted = 0;

  if (caseIds.length === 0) {
    return deleted;
  }

  for (;;) {
    const response = await savedObjectsClient.search({
      type: CASE_OBSERVABLE_SAVED_OBJECT,
      namespaces: [namespace],
      size: OBSERVABLES_DELETE_PAGE_SIZE,
      _source: false,
      query: {
        nested: {
          path: 'references',
          query: {
            bool: {
              filter: [
                { term: { 'references.type': CASE_SAVED_OBJECT } },
                { terms: { 'references.id': caseIds } },
              ],
            },
          },
        },
      },
    });

    const ids = response.hits.hits.flatMap(({ _id: rawId }) =>
      rawId?.startsWith(RAW_ID_PREFIX) ? [rawId.slice(RAW_ID_PREFIX.length)] : []
    );

    if (ids.length === 0) {
      return deleted;
    }

    const { statuses } = await savedObjectsClient.bulkDelete(
      ids.map((id) => ({ type: CASE_OBSERVABLE_SAVED_OBJECT, id })),
      { refresh: 'wait_for', ...(isInternalClient && { namespace }) }
    );

    const failures = statuses.filter(({ success, error }) => !success && error?.statusCode !== 404);
    if (failures.length > 0) {
      throw new Error(
        `Failed to delete ${failures.length} observables of cases [${caseIds.join(
          ', '
        )}]: ${failures.map(({ id, error }) => `${id}: ${error?.message}`).join('; ')}`
      );
    }

    deleted += ids.length;
    logger.debug(`Deleted ${deleted} observables of cases [${caseIds.join(', ')}] so far`);
  }
};
