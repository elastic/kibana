/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type {
  Buckets,
  CollectTelemetryDataParams,
  FieldLibrarySolutionTelemetry,
  FieldLibraryTelemetry,
} from '../types';
import { findValueInBuckets } from './utils';

const SO = CASE_FIELD_DEFINITION_SAVED_OBJECT;

// `isGlobal` is optional in storage and only an explicit `true` means global, so an unset flag
// has to bucket with the explicit `false`s for the two counts to sum to the scope total.
const getGlobalSplitAggregations = () => ({
  globalStates: {
    terms: {
      field: `${SO}.attributes.isGlobal`,
      missing: false,
    },
  },
});

const getByOwnerAggregations = () =>
  OWNERS.reduce(
    (aggs, owner) => ({
      ...aggs,
      [owner]: {
        filter: { term: { [`${SO}.attributes.owner`]: owner } },
        aggs: getGlobalSplitAggregations(),
      },
    }),
    {}
  );

interface ScopeAggregationResult {
  globalStates?: Buckets<number>;
}

type FieldLibraryAggregationResult = Partial<Record<Owner, ScopeAggregationResult>> &
  ScopeAggregationResult;

/**
 * `total` is summed from the split rather than taken from the response total, which is a search
 * hit count that Elasticsearch caps at 10,000 and the saved-objects client cannot raise. Summing
 * also keeps the partition true by construction.
 */
const buildSolutionTelemetry = (scope?: ScopeAggregationResult): FieldLibrarySolutionTelemetry => {
  const buckets = scope?.globalStates?.buckets ?? [];
  // A terms aggregation on a boolean field keys its buckets 1 and 0.
  const totalGlobal = findValueInBuckets(buckets, 1);
  const totalReusable = findValueInBuckets(buckets, 0);

  return { total: totalGlobal + totalReusable, totalGlobal, totalReusable };
};

/** The zeroed area for the caller's flag-off path. */
export const getEmptyFieldLibraryTelemetry = (): Omit<FieldLibraryTelemetry, 'featureEnabled'> => ({
  all: buildSolutionTelemetry(),
  sec: buildSolutionTelemetry(),
  obs: buildSolutionTelemetry(),
  main: buildSolutionTelemetry(),
});

/**
 * Snapshot of the Field Library: how many field definitions exist per solution, and how that
 * splits into global and reusable (available to be referenced by a template, not necessarily
 * referenced by one). Aggregations only; no author-supplied value is read.
 *
 * Reports no feature-flag state and swallows nothing — the caller owns both the flag and the
 * error boundary. See `collect_telemetry_data.ts`.
 */
export const getFieldLibraryTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<Omit<FieldLibraryTelemetry, 'featureEnabled'>> => {
  try {
    const res = await savedObjectsClient.find<unknown, FieldLibraryAggregationResult>({
      page: 0,
      perPage: 0,
      type: SO,
      namespaces: ['*'],
      aggs: {
        ...getByOwnerAggregations(),
        ...getGlobalSplitAggregations(),
      },
    });

    const aggs = res.aggregations;

    return {
      // Unfiltered, so owners outside the three registered solutions still roll up here and
      // `all` can exceed the three scopes below.
      all: buildSolutionTelemetry(aggs),
      sec: buildSolutionTelemetry(aggs?.[SECURITY_SOLUTION_OWNER]),
      obs: buildSolutionTelemetry(aggs?.[OBSERVABILITY_OWNER]),
      main: buildSolutionTelemetry(aggs?.[GENERAL_CASES_OWNER]),
    };
  } catch (error) {
    logger.error(`Cases field library telemetry failed with error: ${error}`);
    throw error;
  }
};
