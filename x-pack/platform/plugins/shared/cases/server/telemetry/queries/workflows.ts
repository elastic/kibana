/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants/workflow';
import type {
  CasesTelemetry,
  CollectTelemetryDataParams,
  Buckets,
  ReferencesAggregation,
} from '../types';
import {
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getReferencesAggregationQuery,
  getOnlyWorkflowUserActionsFilter,
} from './utils';

type WorkflowRunAggs = ReferencesAggregation & {
  counts: Buckets;
  uniqueUsers: { value: number };
  byOriginType: Buckets;
};

interface WorkflowConfigAggs {
  configurationsWithTags: { doc_count: number };
}

/**
 * Collects workflow-run telemetry from two saved object types:
 *
 * 1. `cases-user-actions` (filtered to `type: workflow`) — total/bucketed run counts,
 *    distinct cases, distinct triggering users, and origin-type breakdown.
 * 2. `cases-configure` — number of configurations that have at least one workflow tag set.
 *
 * All fields default to 0 so a cluster that has never run a workflow reports zero
 * rather than an absent field.
 */
export const getWorkflowsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['workflows']> => {
  const workflowFilter = getOnlyWorkflowUserActionsFilter();

  const [runsRes, configRes] = await Promise.all([
    savedObjectsClient.find<unknown, WorkflowRunAggs>({
      page: 0,
      perPage: 0,
      filter: workflowFilter,
      type: CASE_USER_ACTION_SAVED_OBJECT,
      namespaces: ['*'],
      aggs: {
        ...getCountsAggregationQuery(CASE_USER_ACTION_SAVED_OBJECT),
        // Cardinality of distinct cases referenced by workflow user actions.
        ...getReferencesAggregationQuery({
          savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
          referenceType: CASE_SAVED_OBJECT,
          agg: 'cardinality',
        }),
        // Cardinality of distinct users who triggered a workflow.
        uniqueUsers: {
          cardinality: {
            field: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.created_by.username`,
          },
        },
        // Breakdown by origin type. Bulk runs carry no origin so their count is derived
        // as `total − sum(origin buckets)` rather than stored as a separate bucket value.
        byOriginType: {
          terms: {
            field: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.payload.origin.type`,
            // Only the five known origin types; anything unexpected is ignored.
            size: 5,
          },
        },
      },
    }),
    savedObjectsClient.find<unknown, WorkflowConfigAggs>({
      page: 0,
      perPage: 0,
      type: CASE_CONFIGURE_SAVED_OBJECT,
      namespaces: ['*'],
      aggs: {
        configurationsWithTags: {
          filter: {
            exists: { field: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.workflowTags` },
          },
        },
      },
    }),
  ]);

  const runAggs = runsRes.aggregations;
  const countBuckets = runAggs?.counts?.buckets ?? [];
  const totalRuns = runsRes.total;

  // Extract per-origin-type counts from the `terms` aggregation.
  const getOriginCount = (type: string): number =>
    runAggs?.byOriginType?.buckets?.find((b) => b.key === type)?.doc_count ?? 0;

  const originCounts = {
    case: getOriginCount(CASE_WORKFLOW_ORIGIN_TYPE),
    observable: getOriginCount(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
    observables: getOriginCount(OBSERVABLES_WORKFLOW_ORIGIN_TYPE),
    alert: getOriginCount(ALERT_WORKFLOW_ORIGIN_TYPE),
    alerts: getOriginCount(ALERTS_WORKFLOW_ORIGIN_TYPE),
  };

  const originSum = Object.values(originCounts).reduce((s, n) => s + n, 0);

  return {
    runs: {
      total: totalRuns,
      ...getCountsFromBuckets(countBuckets),
    },
    totalCasesWithRuns: runsRes.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
    totalUniqueUsers: runAggs?.uniqueUsers?.value ?? 0,
    byOriginType: {
      ...originCounts,
      // Unattributed: runs with no origin (list-level bulk runs) or an unrecognised origin type.
      // Derived rather than stored because origin is optional on the run request.
      unattributed: Math.max(0, totalRuns - originSum),
    },
    configurationsWithWorkflowTags: configRes.aggregations?.configurationsWithTags?.doc_count ?? 0,
  };
};
