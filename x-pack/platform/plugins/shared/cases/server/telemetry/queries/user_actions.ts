/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTION_SAVED_OBJECT, OWNERS } from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type { CasesTelemetry, CollectTelemetryDataParams, UserActionsBySourceRow } from '../types';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { getCountsAndMaxData } from './utils';

const UNKNOWN_SOURCE = 'unknown';

const SOURCE_TERMS_SIZE = 20;
const TYPE_TERMS_SIZE = 50;

interface TermsBuckets<M = {}> {
  buckets: Array<{ key: string; doc_count: number } & M>;
}

interface BySourceAggregation {
  byOwner: TermsBuckets<{
    bySource: TermsBuckets<{ byType: TermsBuckets }>;
  }>;
}

const queryBySource = (savedObjectsClient: TelemetrySavedObjectsClient) =>
  savedObjectsClient.find<unknown, BySourceAggregation>({
    page: 0,
    perPage: 0,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: {
      byOwner: {
        terms: {
          field: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.owner`,
          size: OWNERS.length,
          include: [...OWNERS],
        },
        aggs: {
          bySource: {
            terms: {
              field: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.source.type`,
              size: SOURCE_TERMS_SIZE,
              missing: UNKNOWN_SOURCE,
            },
            aggs: {
              byType: {
                terms: {
                  field: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type`,
                  size: TYPE_TERMS_SIZE,
                },
              },
            },
          },
        },
      },
    },
  });

const getRowsForOwner = (
  owner: Owner,
  aggregations?: BySourceAggregation
): UserActionsBySourceRow[] => {
  const ownerBucket = aggregations?.byOwner?.buckets?.find((bucket) => bucket.key === owner);

  return (ownerBucket?.bySource?.buckets ?? []).flatMap((sourceBucket) =>
    (sourceBucket.byType?.buckets ?? []).map((typeBucket) => ({
      source: sourceBucket.key,
      type: typeBucket.key,
      total: typeBucket.doc_count,
    }))
  );
};

const sumRows = (rowsByOwner: UserActionsBySourceRow[][]): UserActionsBySourceRow[] => {
  const totals = new Map<string, UserActionsBySourceRow>();

  for (const row of rowsByOwner.flat()) {
    const key = `${row.source}:${row.type}`;
    const existing = totals.get(key);
    totals.set(key, { ...row, total: (existing?.total ?? 0) + row.total });
  }

  return [...totals.values()];
};

export const getUserActionsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['userActions']> => {
  const [counts, bySourceRes] = await Promise.all([
    getCountsAndMaxData({
      savedObjectsClient,
      savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
    }),
    queryBySource(savedObjectsClient),
  ]);

  const sec = getRowsForOwner('securitySolution', bySourceRes.aggregations);
  const obs = getRowsForOwner('observability', bySourceRes.aggregations);
  const main = getRowsForOwner('cases', bySourceRes.aggregations);

  return {
    all: { ...counts.all, bySource: sumRows([sec, obs, main]) },
    sec: { bySource: sec },
    obs: { bySource: obs },
    main: { bySource: main },
  };
};
