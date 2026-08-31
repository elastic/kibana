/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { Owner } from '../../common/constants/types';
import type { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';

export type BucketKeyString = Omit<Bucket, 'key'> & { key: string };

export interface Bucket<T extends string | number = string | number> {
  doc_count: number;
  key: T;
}

export interface AlertBuckets {
  buckets: Array<{ topAlertsPerBucket: { value: number } }>;
}

export interface Buckets<T extends string | number = string | number> {
  buckets: Array<Bucket<T>>;
}

export interface Cardinality {
  value: number;
}

export type ValueCount = Cardinality;

export interface MaxBucketOnCaseAggregation {
  references: { cases: { max: { value: number } } };
}

export interface ReferencesAggregation {
  references: { referenceType: { referenceAgg: { value: number } } };
}

export interface CollectTelemetryDataParams {
  savedObjectsClient: TelemetrySavedObjectsClient;
  logger: Logger;
}

export interface TypeLong {
  type: 'long';
}

export interface TypeString {
  type: 'keyword';
}

export interface Count {
  total: number;
  monthly: number;
  weekly: number;
  daily: number;
}

export interface AssigneesFilters {
  buckets: {
    zero: { doc_count: number };
    atLeastOne: { doc_count: number };
  };
}

export interface ObservablesAggregationResult {
  doc_count: number;
  byDescription: {
    buckets: Array<{
      key: string;
      doc_count: number;
      byType: {
        buckets: Array<{
          key: string;
          doc_count: number;
        }>;
      };
    }>;
  };
}

export interface TotalWithMaxObservablesAggregationResult {
  buckets: Array<{
    key: number;
    doc_count: number;
  }>;
}

export interface FileAttachmentAggsResult {
  averageSize: {
    value: number;
  };
  topMimeTypes: Buckets<string>;
}

export interface CasesWithAlertsAggs {
  withAlerts: {
    doc_count: number;
    byOwner: { buckets: Array<{ key: string; doc_count: number }> };
  };
}

export interface CountsAndMaxAlertsAggRes {
  by_owner: {
    buckets: Array<{
      key: string;
      doc_count: number;
      counts: AlertBuckets;
      uniqueAlertCommentsCount: {
        value: number;
      };
    }>;
  };
}

export interface AlertCounts {
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export type FileAttachmentAggregationResults = Record<Owner, FileAttachmentAggsResult> &
  FileAttachmentAggsResult;

export type CaseAggregationResult = Record<
  Owner,
  {
    counts: Buckets;
    totalAssignees: ValueCount;
    assigneeFilters: AssigneesFilters;
    observables: ObservablesAggregationResult;
    totalWithMaxObservables: TotalWithMaxObservablesAggregationResult;
  }
> & {
  assigneeFilters: AssigneesFilters;
  counts: Buckets;
  syncAlerts: Buckets;
  extractObservables: Buckets;
  observables: ObservablesAggregationResult;
  status: Buckets;
  users: Cardinality;
  tags: Cardinality;
  totalAssignees: ValueCount;
  totalsByOwner: Buckets;
  totalWithMaxObservables: TotalWithMaxObservablesAggregationResult;
};

export interface Assignees {
  total: number;
  totalWithZero: number;
  totalWithAtLeastOne: number;
}

/**
 * Per-type usage counts inside the unified attachment framework. Keyed by the
 * sanitized unified attachment type name (dots replaced with underscores, e.g.
 * `security_alert`). Replaces the legacy `persistableAttachments`/
 * `externalAttachments` arrays and merges both attachment saved objects.
 */
export interface AttachmentTypeStats {
  total: number;
  average: number;
}

export type AttachmentsByType = Record<string, AttachmentTypeStats>;

/**
 * Legacy (`cases-comments`) vs unified (`cases-attachments`) attachment
 * counts. Counts are entity-aware (bulk alert/event
 * attachments count by referenced id, not by document), matching how
 * `attachmentsByType` totals are computed.
 */
export interface BySavedObjectStats {
  legacy: { total: number };
  unified: { total: number };
}

export interface FileAttachmentStats {
  averageSize: number;
  topMimeTypes: Array<{
    name: string;
    count: number;
  }>;
}

export interface AttachmentFramework {
  attachmentFramework: {
    attachmentsByType: AttachmentsByType;
    bySavedObject: BySavedObjectStats;
    files: FileAttachmentStats;
  };
}

export interface SolutionTelemetry extends Count, AttachmentFramework {
  assignees: Assignees;
  totalWithAlerts: number;
  status: Status;
  observables: ObservablesTelemetry;
  totalWithMaxObservables: number;
}

export interface Status {
  open: number;
  inProgress: number;
  closed: number;
}

export interface LatestDates {
  createdAt: string;
  updatedAt: string;
  closedAt: string;
}

export interface ObservablesTelemetry {
  manual: { default: number; custom: number };
  auto: { default: number; custom: number };
  total: number;
}

export interface CustomFieldsTelemetry {
  totalsByType: Record<string, number>;
  totals: number;
  required: number;
}

export interface CustomFieldsSolutionTelemetry {
  customFields: CustomFieldsTelemetry;
}

export type CasesTelemetryConnectorKeys =
  | 'itsm'
  | 'sir'
  | 'jira'
  | 'resilient'
  | 'swimlane'
  | 'thehive'
  | 'caseswebhook';

export interface CasesTelemetry {
  cases: {
    all: Count &
      AttachmentFramework & {
        assignees: Assignees;
        status: Status;
        syncAlertsOn: number;
        syncAlertsOff: number;
        extractObservablesOn: number;
        extractObservablesOff: number;
        observables: ObservablesTelemetry;
        totalWithMaxObservables: number;
        totalUsers: number;
        totalParticipants: number;
        totalTags: number;
        totalWithAlerts: number;
        totalWithConnectors: number;
        latestDates: LatestDates;
      };
    sec: SolutionTelemetry;
    obs: SolutionTelemetry;
    main: SolutionTelemetry;
  };
  userActions: { all: Count & { maxOnACase: number } };
  comments: { all: Count & { maxOnACase: number } };
  alerts: {
    all: Count & { maxOnACase: number };
    obs: Count & { maxOnACase: number };
    sec: Count & { maxOnACase: number };
    main: Count & { maxOnACase: number };
  };
  connectors: {
    all: Record<CasesTelemetryConnectorKeys, { totalAttached: number }> & {
      all: { totalAttached: number };
      maxAttachedToACase: number;
    };
  };
  pushes: {
    all: { total: number; maxOnACase: number };
  };
  configuration: {
    all: {
      closure: {
        manually: number;
        automatic: number;
      };
      customFields: CustomFieldsTelemetry;
    };
    sec: CustomFieldsSolutionTelemetry;
    obs: CustomFieldsSolutionTelemetry;
    main: CustomFieldsSolutionTelemetry;
  };
  casesSystemAction: {
    totalCasesCreated: number;
    totalRules: number;
  };
  workflows: {
    /** Total and time-bucketed workflow run counts (one per case per execution). */
    runs: Count;
    /** Number of distinct cases that have had at least one workflow run. */
    totalCasesWithRuns: number;
    /** Cardinality of distinct usernames that have triggered a workflow from a case. */
    totalUniqueUsers: number;
    /**
     * Breakdown of runs by origin surface. `unattributed` is the residual: runs whose origin was
     * absent (cases-list bulk runs) plus any run with an unrecognised origin type. Derived as
     * `max(0, total − sum(attributed buckets))`.
     *
     * The client EBT event carries the same dimension as `origin_type` but with a `cases.` prefix
     * on each attributed value (e.g. `cases.observable` here becomes `observable`).
     */
    byOriginType: {
      case: number;
      observable: number;
      observables: number;
      alert: number;
      alerts: number;
      unattributed: number;
    };
    /** Number of case configurations that have at least one workflow tag set. */
    configurationsWithWorkflowTags: number;
  };
}

export type CountSchema = MakeSchemaFrom<Count>;
export type StatusSchema = MakeSchemaFrom<Status>;
export type ObservablesSchema = MakeSchemaFrom<ObservablesTelemetry>;
export type LatestDatesSchema = MakeSchemaFrom<LatestDates>;
export type CasesTelemetrySchema = MakeSchemaFrom<CasesTelemetry>;
export type AssigneesSchema = MakeSchemaFrom<Assignees>;
export type AttachmentFrameworkSchema = MakeSchemaFrom<AttachmentFramework['attachmentFramework']>;
export type AttachmentTypeStatsSchema = MakeSchemaFrom<AttachmentTypeStats>;
export type SolutionTelemetrySchema = MakeSchemaFrom<SolutionTelemetry>;
export type CustomFieldsSolutionTelemetrySchema = MakeSchemaFrom<CustomFieldsSolutionTelemetry>;
