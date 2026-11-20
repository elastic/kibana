/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-api-server';
import { CASE_SAVED_OBJECT, OWNERS } from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import { CasePersistedStatus } from '../../common/types/case';
import type {
  CaseAgeBuckets,
  CaseAgeSolutionTelemetry,
  CaseAgeStats,
  CasesTelemetry,
  CollectTelemetryDataParams,
} from '../types';

const SO = CASE_SAVED_OBJECT;

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

type BucketKey = keyof CaseAgeBuckets;

// Non-overlapping ranges in seconds: `from` is inclusive, `to` is exclusive.
const DURATION_RANGES: Array<{ key: BucketKey; from?: number; to?: number }> = [
  { key: 'upTo1h', to: HOUR },
  { key: 'upTo1d', from: HOUR, to: DAY },
  { key: 'upTo7d', from: DAY, to: 7 * DAY },
  { key: 'upTo30d', from: 7 * DAY, to: 30 * DAY },
  { key: 'upTo90d', from: 30 * DAY, to: 90 * DAY },
  { key: 'over90d', from: 90 * DAY },
];

// The same edges expressed on `created_at`, so the bucket is the age of the case now.
const AGE_RANGES: Array<{ key: BucketKey; from?: string; to?: string }> = [
  { key: 'upTo1h', from: 'now-1h' },
  { key: 'upTo1d', from: 'now-1d', to: 'now-1h' },
  { key: 'upTo7d', from: 'now-7d', to: 'now-1d' },
  { key: 'upTo30d', from: 'now-30d', to: 'now-7d' },
  { key: 'upTo90d', from: 'now-90d', to: 'now-30d' },
  { key: 'over90d', to: 'now-90d' },
];

interface PercentileValue {
  key: number;
  value: number | null;
}

interface StatsAggs {
  doc_count: number;
  buckets: { buckets: Partial<Record<BucketKey, { doc_count: number }>> };
  percentiles: { values: PercentileValue[] };
}

interface ScopeAggs {
  closed: StatsAggs;
  open: StatsAggs;
  inProgress: StatsAggs;
}

type CaseAgeAggs = Record<'all' | Owner, ScopeAggs>;

const getActiveAggs = (status: CasePersistedStatus) => ({
  filter: { term: { [`${SO}.status`]: status } },
  aggs: {
    buckets: { date_range: { field: `${SO}.created_at`, keyed: true, ranges: AGE_RANGES } },
    // The 10th percentile of `created_at` is the 90th percentile of age.
    percentiles: { percentiles: { field: `${SO}.created_at`, percents: [10, 50], keyed: false } },
  },
});

const getScopeAggs = () => ({
  closed: {
    filter: {
      bool: {
        filter: [
          { term: { [`${SO}.status`]: CasePersistedStatus.CLOSED } },
          { range: { [`${SO}.closed_at`]: { gte: 'now-30d' } } },
          { exists: { field: `${SO}.duration` } },
        ],
      },
    },
    aggs: {
      buckets: { range: { field: `${SO}.duration`, keyed: true, ranges: DURATION_RANGES } },
      percentiles: { percentiles: { field: `${SO}.duration`, percents: [50, 90], keyed: false } },
    },
  },
  open: getActiveAggs(CasePersistedStatus.OPEN),
  inProgress: getActiveAggs(CasePersistedStatus.IN_PROGRESS),
});

const getPercentile = (aggs: StatsAggs | undefined, percent: number): number | null =>
  aggs?.percentiles?.values?.find(({ key }) => key === percent)?.value ?? null;

const toBuckets = (aggs: StatsAggs | undefined): CaseAgeBuckets => {
  const buckets = aggs?.buckets?.buckets ?? {};
  return DURATION_RANGES.reduce<CaseAgeBuckets>(
    (acc, { key }) => ({ ...acc, [key]: buckets[key]?.doc_count ?? 0 }),
    { upTo1h: 0, upTo1d: 0, upTo7d: 0, upTo30d: 0, upTo90d: 0, over90d: 0 }
  );
};

const toClosedStats = (aggs: StatsAggs | undefined): CaseAgeStats => ({
  total: aggs?.doc_count ?? 0,
  p50: Math.round(getPercentile(aggs, 50) ?? 0),
  p90: Math.round(getPercentile(aggs, 90) ?? 0),
  buckets: toBuckets(aggs),
});

const toActiveStats = (aggs: StatsAggs | undefined, now: number): CaseAgeStats => {
  const toAgeInSeconds = (createdAt: number | null) =>
    createdAt == null ? 0 : Math.max(0, Math.round((now - createdAt) / 1000));

  return {
    total: aggs?.doc_count ?? 0,
    p50: toAgeInSeconds(getPercentile(aggs, 50)),
    p90: toAgeInSeconds(getPercentile(aggs, 10)),
    buckets: toBuckets(aggs),
  };
};

const toSolutionTelemetry = (
  aggs: ScopeAggs | undefined,
  now: number
): CaseAgeSolutionTelemetry => ({
  closed: toClosedStats(aggs?.closed),
  open: toActiveStats(aggs?.open, now),
  inProgress: toActiveStats(aggs?.inProgress, now),
});

/**
 * Time to close for cases closed in the last 30 days, and the current age of open and
 * in-progress cases, in seconds. Uses the search API because the find API rejects `percentiles`.
 */
export const getCaseAgeTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['caseAge']> => {
  const now = Date.now();
  const res = await savedObjectsClient.search<SavedObjectsRawDocSource, CaseAgeAggs>({
    type: [SO],
    namespaces: ['*'],
    size: 0,
    track_total_hits: false,
    aggs: {
      all: { filter: { match_all: {} }, aggs: getScopeAggs() },
      ...OWNERS.reduce(
        (acc, owner) => ({
          ...acc,
          [owner]: { filter: { term: { [`${SO}.owner`]: owner } }, aggs: getScopeAggs() },
        }),
        {}
      ),
    },
  });

  const { aggregations: aggs } = res;

  return {
    all: toSolutionTelemetry(aggs?.all, now),
    sec: toSolutionTelemetry(aggs?.securitySolution, now),
    obs: toSolutionTelemetry(aggs?.observability, now),
    main: toSolutionTelemetry(aggs?.cases, now),
  };
};
