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
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants/workflow';
import type { Owner } from '../../../common/constants/types';
import type {
  CasesTelemetry,
  CollectTelemetryDataParams,
  Buckets,
  ReferencesAggregation,
  WorkflowOriginTypeCounts,
  WorkflowsSolutionTelemetry,
} from '../types';
import { sanitizeTypeKey } from './attachments_by_type';
import {
  bucketsToOwnerRecord,
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getReferencesAggregationQuery,
  getOnlyWorkflowUserActionsFilter,
} from './utils';

const SO = CASE_USER_ACTION_SAVED_OBJECT;

/** Origin bucket for runs that carry no origin (cases-list bulk runs). */
const UNATTRIBUTED_ORIGIN = 'unattributed';

/**
 * Cap on the origin and attachment type `terms` aggregations. Origins are a small fixed set;
 * attachment types come from the registry and may reach the hundreds, so the cap leaves headroom.
 */
const TYPE_TERMS_SIZE = 500;

type WorkflowRunScopeAggs = ReferencesAggregation & {
  doc_count: number;
  counts: Buckets;
  uniqueUsers: { value: number };
  byOriginType: Buckets<string>;
  byAttachmentType: Buckets<string>;
};

type WorkflowRunAggs = Partial<Record<Owner | 'all', WorkflowRunScopeAggs>>;

interface WorkflowConfigAggs {
  configurationsWithTags: { doc_count: number; byOwner: Buckets<string> };
}

const getRunScopeAggregations = () => ({
  ...getCountsAggregationQuery(SO),
  // Cardinality of distinct cases referenced by workflow user actions.
  ...getReferencesAggregationQuery({
    savedObjectType: SO,
    referenceType: CASE_SAVED_OBJECT,
    agg: 'cardinality',
  }),
  // Cardinality of distinct users who triggered a workflow.
  uniqueUsers: {
    cardinality: { field: `${SO}.attributes.created_by.username` },
  },
  byOriginType: {
    terms: {
      field: `${SO}.attributes.payload.origin.type`,
      size: TYPE_TERMS_SIZE,
      missing: UNATTRIBUTED_ORIGIN,
    },
  },
  // Only attachment-origin runs carry `attachmentType`.
  byAttachmentType: {
    terms: {
      field: `${SO}.attributes.payload.origin.attachmentType`,
      size: TYPE_TERMS_SIZE,
    },
  },
});

// `owner` is required on user actions, so `exists` matches every run, including owners outside
// the three registered solutions.
const getRunAggregations = () => ({
  all: {
    filter: { exists: { field: `${SO}.attributes.owner` } },
    aggs: getRunScopeAggregations(),
  },
  ...OWNERS.reduce(
    (aggs, owner) => ({
      ...aggs,
      [owner]: {
        filter: { term: { [`${SO}.attributes.owner`]: owner } },
        aggs: getRunScopeAggregations(),
      },
    }),
    {}
  ),
});

// Only the fixed origin keys are reported, so a stored value outside the API's origin types can
// never surface as an unmapped telemetry key.
const getOriginTypeCounts = (
  buckets: Buckets<string>['buckets'] = []
): WorkflowOriginTypeCounts => {
  const getCount = (originType: string): number =>
    buckets.find(({ key }) => key === originType)?.doc_count ?? 0;

  return {
    case: getCount(CASE_WORKFLOW_ORIGIN_TYPE),
    observable: getCount(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
    observables: getCount(OBSERVABLES_WORKFLOW_ORIGIN_TYPE),
    attachment: getCount(ATTACHMENT_WORKFLOW_ORIGIN_TYPE),
    attachments: getCount(ATTACHMENTS_WORKFLOW_ORIGIN_TYPE),
    unattributed: getCount(UNATTRIBUTED_ORIGIN),
  };
};

const getAttachmentTypeCounts = (
  buckets: Buckets<string>['buckets'] = []
): Record<string, number> =>
  Object.fromEntries(
    buckets.map(({ key, doc_count: docCount }) => [sanitizeTypeKey(key), docCount])
  );

/**
 * `runs.total` is the scope's `doc_count` rather than the response total, which is a search hit
 * count that Elasticsearch caps at 10,000.
 */
const buildSolutionTelemetry = (
  scope: WorkflowRunScopeAggs | undefined,
  configurationsWithWorkflowTags: number
): WorkflowsSolutionTelemetry => ({
  runs: {
    total: scope?.doc_count ?? 0,
    ...getCountsFromBuckets(scope?.counts?.buckets ?? []),
  },
  totalCasesWithRuns: scope?.references?.referenceType?.referenceAgg?.value ?? 0,
  totalUniqueUsers: scope?.uniqueUsers?.value ?? 0,
  byOriginType: getOriginTypeCounts(scope?.byOriginType?.buckets),
  byAttachmentType: getAttachmentTypeCounts(scope?.byAttachmentType?.buckets),
  configurationsWithWorkflowTags,
});

/**
 * Collects workflow-run telemetry, overall and per solution, from two saved object types:
 *
 * 1. `cases-user-actions` (filtered to `type: workflow`) — total/bucketed run counts,
 *    distinct cases, distinct triggering users, and breakdowns by origin type and, for
 *    attachment-origin runs, by attachment type.
 * 2. `cases-configure` — number of configurations that have at least one workflow tag set.
 */
export const getWorkflowsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['workflows']> => {
  const [runsRes, configRes] = await Promise.all([
    savedObjectsClient.find<unknown, WorkflowRunAggs>({
      page: 0,
      perPage: 0,
      filter: getOnlyWorkflowUserActionsFilter(),
      type: SO,
      namespaces: ['*'],
      aggs: getRunAggregations(),
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
          aggs: {
            byOwner: {
              terms: {
                field: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner`,
                size: OWNERS.length,
                include: [...OWNERS],
              },
            },
          },
        },
      },
    }),
  ]);

  const runAggs = runsRes.aggregations;
  const configsWithTags = configRes.aggregations?.configurationsWithTags;
  const configsWithTagsByOwner = bucketsToOwnerRecord(
    configsWithTags?.byOwner?.buckets,
    ({ doc_count: docCount }) => docCount
  );

  return {
    all: buildSolutionTelemetry(runAggs?.all, configsWithTags?.doc_count ?? 0),
    sec: buildSolutionTelemetry(
      runAggs?.[SECURITY_SOLUTION_OWNER],
      configsWithTagsByOwner[SECURITY_SOLUTION_OWNER]
    ),
    obs: buildSolutionTelemetry(
      runAggs?.[OBSERVABILITY_OWNER],
      configsWithTagsByOwner[OBSERVABILITY_OWNER]
    ),
    main: buildSolutionTelemetry(
      runAggs?.[GENERAL_CASES_OWNER],
      configsWithTagsByOwner[GENERAL_CASES_OWNER]
    ),
  };
};
