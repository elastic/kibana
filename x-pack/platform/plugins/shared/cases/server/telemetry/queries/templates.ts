/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query';
import {
  CASE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type {
  Bucket,
  Buckets,
  CollectTelemetryDataParams,
  TemplatesSolutionTelemetry,
  TemplatesTelemetry,
} from '../types';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { findValueInBuckets, getCountsAggregationQuery, getCountsFromBuckets } from './utils';

const SO = CASE_TEMPLATE_SAVED_OBJECT;

const MAX_FIELD_TYPE_BUCKETS = 20;

/**
 * A template's live version: the latest snapshot, not soft-deleted. Both conditions are
 * required — an edit writes a new document and demotes the previous one, and a delete
 * stamps `deletedAt` on every version document, so either condition alone reports version
 * history rather than inventory.
 */
const getLiveTemplatesFilter = () =>
  fromKueryExpression(`${SO}.attributes.isLatest: true AND NOT ${SO}.attributes.deletedAt: *`);

/** The same live-version scoping, inverted on the delete stamp: one hit per deleted template. */
const getSoftDeletedTemplatesFilter = () =>
  fromKueryExpression(`${SO}.attributes.isLatest: true AND ${SO}.attributes.deletedAt: *`);

const getInventoryAggregations = () => ({
  enabledStates: {
    terms: {
      field: `${SO}.attributes.isEnabled`,
      /**
       * `isEnabled` is optional in storage, and only an explicit `false` disables a
       * template — see `expand_template_defaults.ts`, the read that gates creating a case
       * from a template. So an absent flag must bucket as enabled here too. Without
       * `missing`, templates written before the flag existed would count as neither
       * enabled nor disabled and the two counts would not sum to the total.
       */
      missing: true,
    },
  },
  migratedFromV1: {
    filter: { exists: { field: `${SO}.attributes.legacyKey` } },
  },
  versionPercentiles: {
    percentiles: {
      field: `${SO}.attributes.templateVersion`,
      percents: [50, 90, 99],
    },
  },
  totalFieldCount: { sum: { field: `${SO}.attributes.fieldCount` } },
  maxFieldCount: { max: { field: `${SO}.attributes.fieldCount` } },
  averageFieldCount: { avg: { field: `${SO}.attributes.fieldCount` } },
  fieldDefinitions: {
    nested: { path: `${SO}.attributes.fieldDefinitions` },
    aggs: {
      // Only `control` and `type` are read. `name` and `label` are author-supplied and
      // must never reach the payload.
      //
      // Both are excluded on the empty string, which is a real stored value: the model
      // version 2 backfill writes `type: ''` and `control: ''` for a template whose 9.4
      // `fieldNames` held plain strings, until the next write repopulates them. Excluding
      // at the aggregation keeps an empty key out of the payload map without spending one
      // of the bucket slots. The array form means exact terms, not a pattern.
      byControl: {
        terms: {
          field: `${SO}.attributes.fieldDefinitions.control`,
          size: MAX_FIELD_TYPE_BUCKETS,
          exclude: [''],
        },
      },
      byType: {
        terms: {
          field: `${SO}.attributes.fieldDefinitions.type`,
          size: MAX_FIELD_TYPE_BUCKETS,
          exclude: [''],
        },
      },
    },
  },
});

const getAdoptionAggregations = () => ({
  templateAdoption: {
    filters: {
      filters: {
        withTemplate: {
          bool: { filter: { exists: { field: `${CASE_SAVED_OBJECT}.attributes.template.id` } } },
        },
        withoutTemplate: {
          bool: { must_not: { exists: { field: `${CASE_SAVED_OBJECT}.attributes.template.id` } } },
        },
      },
    },
    aggs: getCountsAggregationQuery(CASE_SAVED_OBJECT),
  },
});

/**
 * Repeats an aggregation set inside one filter bucket per owner, so one read serves all
 * scopes. Generic over the set so the compiler holds the per-owner and top-level copies
 * to the same shape. Mirrors `buildOwnerPartitions` in `attachments_by_type.ts`, which is
 * private to that module.
 */
const getByOwnerAggregations = <T extends object>(
  savedObjectType: string,
  getAggregations: () => T
): Record<string, { filter: object; aggs: T }> =>
  OWNERS.reduce(
    (aggs, owner) => ({
      ...aggs,
      [owner]: {
        filter: { term: { [`${savedObjectType}.attributes.owner`]: owner } },
        aggs: getAggregations(),
      },
    }),
    {}
  );

/**
 * Every member is optional because the whole `aggregations` object can be missing, not
 * because a zero-document scope drops a bucket. `find` returns an empty response with no
 * aggregations when none of the requested types are in the allow-list, which is exactly
 * this feature's flag-off path, and also on a missing index or an unauthorized space.
 */
interface InventoryScopeAggregationResult {
  enabledStates?: Buckets<number>;
  migratedFromV1?: { doc_count: number };
  versionPercentiles?: { values?: Record<string, number | null> };
  totalFieldCount?: { value: number | null };
  maxFieldCount?: { value: number | null };
  averageFieldCount?: { value: number | null };
  fieldDefinitions?: {
    byControl?: Buckets<string>;
    byType?: Buckets<string>;
  };
}

type InventoryAggregationResult = Partial<Record<Owner, InventoryScopeAggregationResult>> &
  InventoryScopeAggregationResult & { totalsByOwner?: Buckets<string> };

interface SoftDeletedAggregationResult {
  totalsByOwner?: Buckets<string>;
}

interface AdoptionScopeAggregationResult {
  templateAdoption?: {
    buckets?: {
      withTemplate?: { doc_count: number; counts?: Buckets };
      withoutTemplate?: { doc_count: number; counts?: Buckets };
    };
  };
}

type AdoptionAggregationResult = Partial<Record<Owner, AdoptionScopeAggregationResult>> &
  AdoptionScopeAggregationResult;

const getInventoryTelemetry = (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, InventoryAggregationResult>> =>
  savedObjectsClient.find<unknown, InventoryAggregationResult>({
    page: 0,
    perPage: 0,
    type: SO,
    namespaces: ['*'],
    filter: getLiveTemplatesFilter(),
    aggs: {
      ...getByOwnerAggregations(SO, getInventoryAggregations),
      ...getInventoryAggregations(),
      totalsByOwner: { terms: { field: `${SO}.attributes.owner` } },
    },
  });

const getSoftDeletedTelemetry = (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, SoftDeletedAggregationResult>> =>
  savedObjectsClient.find<unknown, SoftDeletedAggregationResult>({
    page: 0,
    perPage: 0,
    type: SO,
    namespaces: ['*'],
    filter: getSoftDeletedTemplatesFilter(),
    aggs: {
      totalsByOwner: { terms: { field: `${SO}.attributes.owner` } },
    },
  });

const getAdoptionTelemetry = (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, AdoptionAggregationResult>> =>
  savedObjectsClient.find<unknown, AdoptionAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: {
      ...getByOwnerAggregations(CASE_SAVED_OBJECT, getAdoptionAggregations),
      ...getAdoptionAggregations(),
    },
  });

/**
 * The aggregations already exclude the empty term, so the guard here is deliberate
 * redundancy: an empty key in a telemetry map is rejected by the receiving index, which
 * would cost the whole Cases payload rather than just these two maps.
 */
const bucketsToRecord = (buckets?: Array<Bucket<string>>): Record<string, number> => {
  const record: Record<string, number> = {};
  buckets?.forEach((bucket) => {
    if (bucket.key !== '') {
      record[bucket.key] = bucket.doc_count;
    }
  });
  return record;
};

const getVersionPercentiles = (values?: Record<string, number | null>) => ({
  p50: Math.round(values?.['50.0'] ?? 0),
  p90: Math.round(values?.['90.0'] ?? 0),
  p99: Math.round(values?.['99.0'] ?? 0),
});

const buildSolutionTelemetry = ({
  inventory,
  total,
  totalSoftDeleted,
  adoption,
}: {
  inventory?: InventoryScopeAggregationResult;
  total: number;
  totalSoftDeleted: number;
  adoption?: AdoptionScopeAggregationResult;
}): TemplatesSolutionTelemetry => {
  const enabledBuckets = inventory?.enabledStates?.buckets ?? [];
  const adoptionBuckets = adoption?.templateAdoption?.buckets;

  return {
    total,
    // A terms aggregation on a boolean field keys its buckets 1 and 0.
    totalEnabled: findValueInBuckets(enabledBuckets, 1),
    totalDisabled: findValueInBuckets(enabledBuckets, 0),
    totalSoftDeleted,
    totalMigratedFromV1: inventory?.migratedFromV1?.doc_count ?? 0,
    versionPercentiles: getVersionPercentiles(inventory?.versionPercentiles?.values),
    fieldCount: {
      total: inventory?.totalFieldCount?.value ?? 0,
      max: inventory?.maxFieldCount?.value ?? 0,
      average: Math.round(inventory?.averageFieldCount?.value ?? 0),
    },
    fieldDefinitions: {
      totalsByControl: bucketsToRecord(inventory?.fieldDefinitions?.byControl?.buckets),
      totalsByType: bucketsToRecord(inventory?.fieldDefinitions?.byType?.buckets),
    },
    cases: {
      withTemplate: {
        total: adoptionBuckets?.withTemplate?.doc_count ?? 0,
        ...getCountsFromBuckets(adoptionBuckets?.withTemplate?.counts?.buckets ?? []),
      },
      withoutTemplate: {
        total: adoptionBuckets?.withoutTemplate?.doc_count ?? 0,
        ...getCountsFromBuckets(adoptionBuckets?.withoutTemplate?.counts?.buckets ?? []),
      },
    },
  };
};

/**
 * The zeroed subject area, for the caller's flag-off path. Built from the same assembly
 * the populated path uses, so it cannot drift from the payload contract when a key is
 * added.
 */
export const getEmptyTemplatesTelemetry = (): Omit<TemplatesTelemetry, 'featureEnabled'> => {
  const emptyScope = () => buildSolutionTelemetry({ total: 0, totalSoftDeleted: 0 });

  return { all: emptyScope(), sec: emptyScope(), obs: emptyScope(), main: emptyScope() };
};

/**
 * Snapshot of the template inventory, its field-type usage, and template adoption across
 * cases. Aggregations only — no template name, tag, author, or definition text is read.
 *
 * Reports no feature-flag state: the caller owns the flag, and only calls this when the
 * flag is on. See `collect_telemetry_data.ts`.
 */
export const getTemplatesTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<Omit<TemplatesTelemetry, 'featureEnabled'>> => {
  try {
    const [inventoryRes, softDeletedRes, adoptionRes] = await Promise.all([
      getInventoryTelemetry(savedObjectsClient),
      getSoftDeletedTelemetry(savedObjectsClient),
      getAdoptionTelemetry(savedObjectsClient),
    ]);

    const inventoryAggs = inventoryRes.aggregations;
    const adoptionAggs = adoptionRes.aggregations;
    const softDeletedByOwner = softDeletedRes.aggregations?.totalsByOwner?.buckets ?? [];
    const totalsByOwner = inventoryAggs?.totalsByOwner?.buckets ?? [];

    const buildForOwner = (owner: Owner) =>
      buildSolutionTelemetry({
        inventory: inventoryAggs?.[owner],
        total: findValueInBuckets(totalsByOwner, owner),
        totalSoftDeleted: findValueInBuckets(softDeletedByOwner, owner),
        adoption: adoptionAggs?.[owner],
      });

    return {
      all: buildSolutionTelemetry({
        inventory: inventoryAggs,
        total: inventoryRes.total,
        totalSoftDeleted: softDeletedRes.total,
        adoption: adoptionAggs,
      }),
      sec: buildForOwner(SECURITY_SOLUTION_OWNER),
      obs: buildForOwner(OBSERVABILITY_OWNER),
      main: buildForOwner(GENERAL_CASES_OWNER),
    };
  } catch (error) {
    logger.error(`Cases templates telemetry failed with error: ${error}`);
    throw error;
  }
};
