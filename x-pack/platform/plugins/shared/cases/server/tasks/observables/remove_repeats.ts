/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_STORED_OBSERVABLES_PER_CASE,
} from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { caseReferenceQuery, keysQuery, observableField } from '../../services/observables';

/** Cases checked per page of the scan. */
const CASES_PAGE_SIZE = 100;
/** Most repeats of one type key and value removed in one run. */
const MAX_COPIES_PER_KEY = 100;
/** Most type keys a case is checked for in one run. */
const MAX_TYPE_KEYS_PER_CASE = 1_000;

const OBSERVABLE_RAW_ID_PREFIX = `${CASE_OBSERVABLE_SAVED_OBJECT}:`;
const CASE_RAW_ID_PREFIX = `${CASE_SAVED_OBJECT}:`;

export interface RemoveRepeatsResult {
  casesChecked: number;
  removed: number;
  totalsSet: number;
}

interface CaseIdsAggs {
  refs: {
    cases: {
      caseIds: {
        after_key?: Record<string, string>;
        buckets: Array<{ key: { caseId: string } }>;
      };
    };
  };
}

interface RepeatsAggs {
  byType: {
    buckets: Array<{
      byValue: {
        buckets: Array<{ copies: { hits: { hits: Array<{ _id?: string }> } } }>;
      };
    }>;
  };
}

interface CaseSource {
  namespaces?: string[];
  cases?: { observables?: Observable[] | null; total_observables?: number | null };
}

const toObservableId = (rawId: string | undefined): string[] =>
  rawId?.startsWith(OBSERVABLE_RAW_ID_PREFIX) ? [rawId.slice(OBSERVABLE_RAW_ID_PREFIX.length)] : [];

const getTotal = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

/**
 * Removes repeated observables of cases that gained `cases-observables` objects since `since`:
 * two requests that add the same value at the same moment can both pass the repeat lookup. It keeps
 * the case field's copy, or the oldest object when every copy is in the type, deletes the rest, and
 * sets the stored total again, which also repairs a total left behind by a write that stopped
 * between its create and its case update.
 */
export const removeRepeatedObservables = async ({
  savedObjectsClient,
  logger,
  since,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  since?: string;
}): Promise<RemoveRepeatsResult> => {
  const result: RemoveRepeatsResult = { casesChecked: 0, removed: 0, totalsSet: 0 };
  let after: Record<string, string> | undefined;

  do {
    const response = await savedObjectsClient.search<never, CaseIdsAggs>({
      type: CASE_OBSERVABLE_SAVED_OBJECT,
      namespaces: [ALL_NAMESPACES_STRING],
      size: 0,
      query:
        since != null
          ? { range: { [observableField('created_at')]: { gte: since } } }
          : { match_all: {} },
      aggs: {
        refs: {
          nested: { path: 'references' },
          aggs: {
            cases: {
              filter: { term: { 'references.type': CASE_SAVED_OBJECT } },
              aggs: {
                caseIds: {
                  composite: {
                    size: CASES_PAGE_SIZE,
                    sources: [{ caseId: { terms: { field: 'references.id' } } }],
                    ...(after != null && { after }),
                  },
                },
              },
            },
          },
        },
      },
    });

    const { buckets = [], after_key: afterKey } = response.aggregations?.refs.cases.caseIds ?? {};
    const caseIds = buckets.map(({ key }) => key.caseId);

    if (caseIds.length > 0) {
      const pageResult = await removeRepeatsOfCases({ savedObjectsClient, caseIds, logger });
      result.casesChecked += caseIds.length;
      result.removed += pageResult.removed;
      result.totalsSet += pageResult.totalsSet;
    }

    after = buckets.length === CASES_PAGE_SIZE ? afterKey : undefined;
  } while (after != null);

  return result;
};

const removeRepeatsOfCases = async ({
  savedObjectsClient,
  caseIds,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
  logger: Logger;
}): Promise<Omit<RemoveRepeatsResult, 'casesChecked'>> => {
  const result = { removed: 0, totalsSet: 0 };

  const casesResponse = await savedObjectsClient.search<CaseSource>({
    type: CASE_SAVED_OBJECT,
    namespaces: [ALL_NAMESPACES_STRING],
    size: caseIds.length,
    query: { ids: { values: caseIds.map((id) => `${CASE_RAW_ID_PREFIX}${id}`) } },
  });

  for (const hit of casesResponse.hits.hits) {
    const caseId = hit._id?.slice(CASE_RAW_ID_PREFIX.length);
    const namespace = hit._source?.namespaces?.[0];

    // A case that is gone leaves its observables to the case-delete task.
    if (caseId != null && namespace != null) {
      try {
        const caseResult = await removeRepeatsOfCase({
          savedObjectsClient,
          caseId,
          namespace,
          fieldObservables: hit._source?.cases?.observables ?? [],
          storedTotal: hit._source?.cases?.total_observables ?? null,
        });
        result.removed += caseResult.removed;
        result.totalsSet += caseResult.totalSet ? 1 : 0;
      } catch (error) {
        logger.error(
          `Failed to remove repeated observables of case ${caseId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  return result;
};

const removeRepeatsOfCase = async ({
  savedObjectsClient,
  caseId,
  namespace,
  fieldObservables,
  storedTotal,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  namespace: string;
  fieldObservables: Observable[];
  storedTotal: number | null;
}): Promise<{ removed: number; totalSet: boolean }> => {
  const [typeRepeats, fieldRepeats] = await Promise.all([
    findRepeatsWithinType({ savedObjectsClient, caseId, namespace }),
    findRepeatsOfField({ savedObjectsClient, caseId, namespace, fieldObservables }),
  ]);
  const idsToDelete = [...new Set([...typeRepeats, ...fieldRepeats])];

  if (idsToDelete.length > 0) {
    await savedObjectsClient.bulkDelete(
      idsToDelete.map((id) => ({ type: CASE_OBSERVABLE_SAVED_OBJECT, id })),
      { namespace, refresh: 'wait_for' }
    );
  }

  const countResponse = await savedObjectsClient.search({
    type: CASE_OBSERVABLE_SAVED_OBJECT,
    namespaces: [namespace],
    size: 0,
    track_total_hits: true,
    query: { bool: { filter: [caseReferenceQuery([caseId])] } },
  });
  const total = fieldObservables.length + getTotal(countResponse.hits.total);

  if (total === storedTotal) {
    return { removed: idsToDelete.length, totalSet: false };
  }

  await savedObjectsClient.update(
    CASE_SAVED_OBJECT,
    caseId,
    { total_observables: total },
    { namespace }
  );

  return { removed: idsToDelete.length, totalSet: true };
};

/** Every copy but the oldest of each type key and value the type holds more than once. */
const findRepeatsWithinType = async ({
  savedObjectsClient,
  caseId,
  namespace,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  namespace: string;
}): Promise<string[]> => {
  const response = await savedObjectsClient.search<never, RepeatsAggs>({
    type: CASE_OBSERVABLE_SAVED_OBJECT,
    namespaces: [namespace],
    size: 0,
    query: { bool: { filter: [caseReferenceQuery([caseId])] } },
    aggs: {
      byType: {
        terms: { field: observableField('type_key'), size: MAX_TYPE_KEYS_PER_CASE },
        aggs: {
          byValue: {
            terms: {
              field: observableField('value'),
              size: MAX_STORED_OBSERVABLES_PER_CASE,
              min_doc_count: 2,
            },
            aggs: {
              copies: {
                top_hits: {
                  size: MAX_COPIES_PER_KEY,
                  _source: false,
                  sort: [{ [observableField('created_at')]: { order: 'asc' } }],
                },
              },
            },
          },
        },
      },
    },
  });

  return (response.aggregations?.byType.buckets ?? []).flatMap(({ byValue }) =>
    byValue.buckets.flatMap(({ copies }) =>
      copies.hits.hits.slice(1).flatMap(({ _id: rawId }) => toObservableId(rawId))
    )
  );
};

/** Every object of the type that repeats an observable of the case field. */
const findRepeatsOfField = async ({
  savedObjectsClient,
  caseId,
  namespace,
  fieldObservables,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  namespace: string;
  fieldObservables: Observable[];
}): Promise<string[]> => {
  if (fieldObservables.length === 0) {
    return [];
  }

  const response = await savedObjectsClient.search({
    type: CASE_OBSERVABLE_SAVED_OBJECT,
    namespaces: [namespace],
    size: Math.min(fieldObservables.length * MAX_COPIES_PER_KEY, MAX_STORED_OBSERVABLES_PER_CASE),
    _source: false,
    query: { bool: { filter: [caseReferenceQuery([caseId]), keysQuery(fieldObservables)] } },
  });

  return response.hits.hits.flatMap(({ _id: rawId }) => toObservableId(rawId));
};
