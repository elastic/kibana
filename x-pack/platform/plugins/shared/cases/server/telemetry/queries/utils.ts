/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-api-server';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  OWNERS,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '../../../common/constants';
import {
  AUTO_EXTRACT_OBSERVABLE_DESCRIPTION,
  OBSERVABLE_TYPES_BUILTIN_KEYS,
} from '../../../common/constants/observables';
import type {
  CaseAggregationResult,
  Buckets,
  MaxBucketOnCaseAggregation,
  SolutionTelemetry,
  FileAttachmentAggregationResults,
  CustomFieldsTelemetry,
  AlertBuckets,
  ObservablesAggregationResult,
  ObservablesTelemetry,
  TotalWithMaxObservablesAggregationResult,
} from '../types';
import type { AttachmentsByTypeRaw } from './attachments_by_type';
import { buildAttachmentFramework } from './attachments_by_type';
import { buildFilter } from '../../client/utils';
import type { Owner } from '../../../common/constants/types';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { CasePersistedStatus } from '../../common/types/case';

export const getCountsAggregationQuery = (savedObjectType: string) => ({
  counts: {
    date_range: {
      field: `${savedObjectType}.attributes.created_at`,
      format: 'dd/MM/yyyy',
      ranges: [
        { from: 'now-1d', to: 'now' },
        { from: 'now-1w', to: 'now' },
        { from: 'now-1M', to: 'now' },
      ],
    },
  },
});

export const getAlertsCountsAggregationQuery = (
  savedObjectType: string = CASE_COMMENT_SAVED_OBJECT,
  alertField: string = 'alertId'
) => ({
  counts: {
    date_range: {
      field: `${savedObjectType}.attributes.created_at`,
      format: 'dd/MM/yyyy',
      ranges: [
        { from: 'now-1d', to: 'now' },
        { from: 'now-1w', to: 'now' },
        { from: 'now-1M', to: 'now' },
      ],
    },
    aggregations: {
      topAlertsPerBucket: {
        cardinality: {
          field: `${savedObjectType}.attributes.${alertField}`,
        },
      },
    },
  },
});

export const getMaxBucketOnCaseAggregationQuery = (savedObjectType: string) => ({
  references: {
    nested: {
      path: `${savedObjectType}.references`,
    },
    aggregations: {
      cases: {
        filter: {
          term: {
            [`${savedObjectType}.references.type`]: CASE_SAVED_OBJECT,
          },
        },
        aggregations: {
          ids: {
            terms: {
              field: `${savedObjectType}.references.id`,
            },
          },
          max: {
            max_bucket: {
              buckets_path: 'ids._count',
            },
          },
        },
      },
    },
  },
});

export const getUniqueAlertCommentsCountQuery = (
  savedObjectType: string = CASE_COMMENT_SAVED_OBJECT,
  alertField: string = 'alertId'
) => ({
  uniqueAlertCommentsCount: {
    cardinality: {
      field: `${savedObjectType}.attributes.${alertField}`,
    },
  },
});

export const getReferencesAggregationQuery = ({
  savedObjectType,
  referenceType,
  agg = 'terms',
}: {
  savedObjectType: string;
  referenceType: string;
  agg?: string;
}) => ({
  references: {
    nested: {
      path: `${savedObjectType}.references`,
    },
    aggregations: {
      referenceType: {
        filter: {
          term: {
            [`${savedObjectType}.references.type`]: referenceType,
          },
        },
        aggregations: {
          referenceAgg: {
            [agg]: {
              field: `${savedObjectType}.references.id`,
            },
          },
        },
      },
    },
  },
});

export const getConnectorsCardinalityAggregationQuery = () =>
  getReferencesAggregationQuery({
    savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
    referenceType: 'action',
    agg: 'cardinality',
  });

export const getCountsFromBuckets = (buckets: Buckets['buckets']) => ({
  daily: buckets?.[2]?.doc_count ?? 0,
  weekly: buckets?.[1]?.doc_count ?? 0,
  monthly: buckets?.[0]?.doc_count ?? 0,
});

export const getAlertsCountsFromBuckets = (buckets: AlertBuckets['buckets']) => ({
  daily: buckets?.[2]?.topAlertsPerBucket?.value ?? 0,
  weekly: buckets?.[1]?.topAlertsPerBucket?.value ?? 0,
  monthly: buckets?.[0]?.topAlertsPerBucket?.value ?? 0,
});

/**
 * Reduces owner-keyed aggregation buckets into a `Record<Owner, number>` seeded
 * with zeros, so every solution is represented even when a bucket is missing.
 */
export const bucketsToOwnerRecord = <T extends { key: string }>(
  buckets: T[] | undefined,
  getValue: (bucket: T) => number
): Record<Owner, number> => {
  const record: Record<Owner, number> = { securitySolution: 0, observability: 0, cases: 0 };
  buckets?.forEach((bucket) => {
    record[bucket.key as Owner] = getValue(bucket);
  });
  return record;
};

export const getObservablesTotalsByType = (
  observablesAggs?: ObservablesAggregationResult
): ObservablesTelemetry => {
  const result: ObservablesTelemetry = {
    manual: { default: 0, custom: 0 },
    auto: { default: 0, custom: 0 },
    total: 0,
  };

  if (!observablesAggs || !observablesAggs.byDescription?.buckets) {
    return result;
  }

  observablesAggs.byDescription.buckets.forEach((bucket) => {
    const description = bucket.key;

    bucket.byType.buckets.forEach((typeBucket) => {
      const type = OBSERVABLE_TYPES_BUILTIN_KEYS.includes(typeBucket.key) ? 'default' : 'custom';
      const count = typeBucket.doc_count;

      if (description === AUTO_EXTRACT_OBSERVABLE_DESCRIPTION) {
        result.auto[type] += count;
      } else {
        result.manual[type] += count;
      }
      result.total += count;
    });
  });
  return result;
};

export const getTotalWithMaxObservables = (
  totalWithMaxObservablesAgg?: TotalWithMaxObservablesAggregationResult['buckets']
): number => {
  if (!totalWithMaxObservablesAgg || totalWithMaxObservablesAgg.length === 0) {
    return 0;
  }

  // Sum doc_count for all buckets where key (total_observables value) >= 50
  return totalWithMaxObservablesAgg.reduce((sum, bucket) => {
    const key = typeof bucket.key === 'number' ? bucket.key : Number(bucket.key);
    return key >= MAX_OBSERVABLES_PER_CASE ? sum + (bucket.doc_count ?? 0) : sum;
  }, 0);
};

interface MaxCounterAggs {
  maxCounter: { value: number | null };
  byOwner?: {
    buckets: Array<{ key: string; maxCounter: { value: number | null } }>;
  };
}

const clampCounter = (value?: number | null) => Math.max(value ?? 0, 0);

/**
 * Max value of a denormalized case counter (e.g. `total_alerts`, `total_comments`),
 * which already combines legacy and unified attachments (so a mixed case isn't
 * split). The `-1` sentinel from unmigrated pre-8.7 cases is clamped to 0.
 * `byOwner` optionally adds the per-solution breakdown.
 */
export const getMaxCounterOnACase = async (
  savedObjectsClient: TelemetrySavedObjectsClient,
  counterField: 'total_alerts' | 'total_comments',
  { byOwner = false }: { byOwner?: boolean } = {}
): Promise<{ all: number; byOwner: Record<Owner, number> }> => {
  const field = `${CASE_SAVED_OBJECT}.${counterField}`;
  const res = await savedObjectsClient.search<SavedObjectsRawDocSource, MaxCounterAggs>({
    type: [CASE_SAVED_OBJECT],
    namespaces: ['*'],
    size: 0,
    aggs: {
      maxCounter: { max: { field } },
      ...(byOwner
        ? {
            byOwner: {
              terms: {
                field: `${CASE_SAVED_OBJECT}.owner`,
                size: OWNERS.length,
                include: [...OWNERS],
              },
              aggs: { maxCounter: { max: { field } } },
            },
          }
        : {}),
    },
  });

  const { aggregations: aggs } = res;
  return {
    all: clampCounter(aggs?.maxCounter?.value),
    byOwner: bucketsToOwnerRecord(aggs?.byOwner?.buckets, ({ maxCounter }) =>
      clampCounter(maxCounter?.value)
    ),
  };
};

/**
 * Time-bucketed counts (total/daily/weekly/monthly) for a saved object type.
 * Unlike `getCountsAndMaxData`, it skips the expensive nested max-per-case
 * aggregation — use it when `maxOnACase` comes from a denormalized case counter.
 */
export const getCountsData = async ({
  savedObjectsClient,
  savedObjectType,
  filter,
}: {
  savedObjectsClient: TelemetrySavedObjectsClient;
  savedObjectType: string;
  filter?: KueryNode;
}): Promise<{ all: { total: number; daily: number; weekly: number; monthly: number } }> => {
  const res = await savedObjectsClient.find<unknown, { counts: Buckets }>({
    page: 0,
    perPage: 0,
    filter,
    type: savedObjectType,
    namespaces: ['*'],
    aggs: { ...getCountsAggregationQuery(savedObjectType) },
  });

  return {
    all: {
      total: res.total,
      ...getCountsFromBuckets(res.aggregations?.counts?.buckets ?? []),
    },
  };
};

export const getCountsAndMaxData = async ({
  savedObjectsClient,
  savedObjectType,
  filter,
}: {
  savedObjectsClient: TelemetrySavedObjectsClient;
  savedObjectType: string;
  filter?: KueryNode;
}) => {
  const res = await savedObjectsClient.find<
    unknown,
    {
      counts: Buckets;
      references: MaxBucketOnCaseAggregation['references'];
    }
  >({
    page: 0,
    perPage: 0,
    filter,
    type: savedObjectType,
    namespaces: ['*'],
    aggs: {
      ...getCountsAggregationQuery(savedObjectType),
      ...getMaxBucketOnCaseAggregationQuery(savedObjectType),
    },
  });

  const countsBuckets = res.aggregations?.counts?.buckets ?? [];
  const maxOnACase = res.aggregations?.references?.cases?.max?.value ?? 0;

  return {
    all: {
      total: res.total,
      ...getCountsFromBuckets(countsBuckets),
      maxOnACase,
    },
  };
};

export const getBucketFromAggregation = ({
  aggs,
  key,
}: {
  key: string;
  aggs?: Record<string, unknown>;
}): Buckets['buckets'] => (get(aggs, `${key}.buckets`) ?? []) as Buckets['buckets'];

export const getSolutionValues = ({
  caseAggregations,
  attachmentsByType,
  filesAggregations,
  totalWithAlertsByOwner,
  owner,
}: {
  caseAggregations?: CaseAggregationResult;
  attachmentsByType?: AttachmentsByTypeRaw;
  filesAggregations?: FileAttachmentAggregationResults;
  totalWithAlertsByOwner?: Record<Owner, number>;
  owner: Owner;
}): SolutionTelemetry => {
  const aggregationsBuckets = getAggregationsBuckets({
    aggs: caseAggregations,
    keys: [
      'totalsByOwner',
      'securitySolution.counts',
      'observability.counts',
      'cases.counts',
      `${owner}.status`,
    ],
  });
  const totalCasesForOwner = findValueInBuckets(aggregationsBuckets.totalsByOwner, owner);
  const fileAttachmentsForOwner = filesAggregations?.[owner];
  return {
    total: totalCasesForOwner,
    ...getCountsFromBuckets(aggregationsBuckets[`${owner}.counts`]),
    status: {
      open: findValueInBuckets(aggregationsBuckets[`${owner}.status`], CasePersistedStatus.OPEN),
      inProgress: findValueInBuckets(
        aggregationsBuckets[`${owner}.status`],
        CasePersistedStatus.IN_PROGRESS
      ),
      closed: findValueInBuckets(
        aggregationsBuckets[`${owner}.status`],
        CasePersistedStatus.CLOSED
      ),
    },
    ...buildAttachmentFramework({
      rawScope: attachmentsByType?.[owner],
      filesAggregations: fileAttachmentsForOwner,
      totalCasesForOwner,
    }),
    observables: getObservablesTotalsByType(caseAggregations?.[owner]?.observables),
    totalWithMaxObservables: getTotalWithMaxObservables(
      caseAggregations?.[owner]?.totalWithMaxObservables?.buckets ?? []
    ),
    totalWithAlerts: totalWithAlertsByOwner?.[owner] ?? 0,
    assignees: {
      total: caseAggregations?.[owner].totalAssignees.value ?? 0,
      totalWithZero: caseAggregations?.[owner].assigneeFilters.buckets.zero.doc_count ?? 0,
      totalWithAtLeastOne:
        caseAggregations?.[owner].assigneeFilters.buckets.atLeastOne.doc_count ?? 0,
    },
  };
};

export const getCustomFieldsTelemetry = (
  customFields?: ConfigurationPersistedAttributes['customFields']
): CustomFieldsTelemetry => {
  const customFiledTypes: Record<string, number> = {};

  const totalsByType = customFields?.reduce((a, c) => {
    if (c?.type) {
      Object.assign(customFiledTypes, { [c.type]: (customFiledTypes[c.type] ?? 0) + 1 });
    }

    return customFiledTypes;
  }, {});

  const allRequiredCustomFields = customFields?.filter((field) => field?.required).length;

  return {
    totalsByType: totalsByType ?? {},
    totals: customFields?.length ?? 0,
    required: allRequiredCustomFields ?? 0,
  };
};

export const findValueInBuckets = (buckets: Buckets['buckets'], value: string | number): number =>
  buckets.find(({ key }) => key === value)?.doc_count ?? 0;

export const getAggregationsBuckets = ({
  aggs,
  keys,
}: {
  keys: string[];
  aggs?: Record<string, unknown>;
}) =>
  keys.reduce<Record<string, Buckets['buckets']>>((acc, key) => {
    acc[key] = getBucketFromAggregation({ aggs, key });
    return acc;
  }, {});

export const getOnlyAlertsCommentsFilter = () =>
  buildFilter({
    filters: ['alert'],
    field: 'type',
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });

export const getOnlyUnifiedAlertsFilter = () =>
  buildFilter({
    filters: [
      SECURITY_ALERT_ATTACHMENT_TYPE,
      OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
      STACK_ALERT_ATTACHMENT_TYPE,
    ],
    field: 'type',
    operator: 'or',
    type: CASE_ATTACHMENT_SAVED_OBJECT,
  });

export const getOnlyConnectorsFilter = () =>
  buildFilter({
    filters: ['connector'],
    field: 'type',
    operator: 'or',
    type: CASE_USER_ACTION_SAVED_OBJECT,
  });

/** Filters the user-action saved object query to workflow user actions only. */
export const getOnlyWorkflowUserActionsFilter = () =>
  buildFilter({
    filters: ['workflow'],
    field: 'type',
    operator: 'or',
    type: CASE_USER_ACTION_SAVED_OBJECT,
  });
