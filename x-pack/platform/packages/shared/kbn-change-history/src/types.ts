/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Represents a single document in the change history.
 * Using ECS field notation as much as possible.
 * @see https://www.elastic.co/docs/reference/ecs/ecs-field-reference
 */
export interface ChangeHistoryDocument {
  '@timestamp': string;

  user: {
    id: string; // Unique identifier for the user.
    name?: string; // Name of the user at the time of the change. (Optional)
    email?: string; // Email address of the user at the time of the change. (Optional)
    ip?: string; // IP address of the user at the time of the change. (Optional)
  };

  event: {
    id: string; // Unique identifier for the event.
    module: string; // Kibana module that the event belongs to (e.g. `security`, etc.)
    dataset: string; // Name of the dataset that the event belongs to (e.g. `alerting-rules`, etc.)
    action: string; // The action performed (`rule-create`, `rule-update`, `rule-delete`, etc.)
    type: 'change' | 'creation' | 'deletion'; // ECS Categorization of the event performed (`creation`, `change`, `deletion`)
    outcome: 'success'; // ECS Outcome of the event (`success`)
    reason?: string; // Reason for the change. (Optional)
    start?: string; // ISO8601 timestamp of the event start time. (Optional)
    created?: string; // ISO8601 timestamp of the event creation time. (Optional)
    ingested?: string; // ISO8601 timestamp of the event ingestion time. (Optional)
    duration?: number; // Duration of the event in milliseconds. (Optional)
    group?: { id: string }; // ID shared between events that take place as a group. (Optional)
  };

  object: {
    id: string; // Unique id of the target object in kibana.
    type: string; // Type of the target object in kibana.
    hash: string; // SHA256 hash of the object.snapshot to identify the payload.
    changes?: string[]; // List of field names that changed. (Optional)
    oldvalues?: Record<string, unknown>; // Previous values for changed fields. (Optional)
    snapshot: Record<string, unknown>; // Full snapshot after the change. (Optional)
  };

  // Optional metadata about the event.
  // Information that does not form part of the diff or ECS schema.
  metadata?: Record<string, unknown>;

  kibana: {
    space_id: string; // ID of the space that the event belongs to.
    version: string; // Version of Kibana that the event belongs to.
  };
}

export interface ObjectChange {
  id: string;
  type: string;
  current?: Record<string, any>; // <-- Current version of the object. If available.
  next: Record<string, any>; // <-- Version of the object after changes (ie the snapshot). Always required.
}

export interface LogChangeHistoryOptions {
  action: string;
  userId: string;
  spaceId: string;
  correlationId?: string;
  overrides?: Partial<Pick<ChangeHistoryDocument, 'event' | 'metadata'>>;
  excludeFields?: ChangeTrackingExcludeFilter;
  sensitiveFields?: ChangeTrackingSensitiveDataFilter;
  // Optional diff to be used instead of standard diff calculation
  diffDocCalculation?: (opts: ChangeTrackingDiffOptions) => ChangeTrackingDiff;
}

export interface GetChangeHistoryOptions {
  additionalFilters?: QueryDslQueryContainer[];
  sort?: SortCombinations[];
  from?: number;
  size?: number;
  transportOpts?: TransportRequestOptionsWithOutMeta;
}

/**
 * Values to override in the change history log entry
 */
export type LogChangeOverrides = Partial<ChangeHistoryDocument>;

/**
 * Result from a history query.
 */
export interface GetHistoryResult {
  startDate?: Date;
  total: number;
  items: ChangeHistoryDocument[];
}

/**
 * Fields excluded from diff calculation
 */
export interface ChangeTrackingExcludeFilter {
  [Key: string]: boolean | ChangeTrackingExcludeFilter;
}

/**
 * Fields hashed due to sensitive nature (PII, Secret keys, etc)
 */
export interface ChangeTrackingSensitiveDataFilter {
  [Key: string]: boolean | ChangeTrackingSensitiveDataFilter;
}

/**
 * Input for the diff calculation
 */
export interface ChangeTrackingDiffOptions {
  a?: Record<string, any>;
  b?: Record<string, any>;
  excludeFields?: ChangeTrackingExcludeFilter;
}

/**
 * Output of the diff calculation
 */
export interface ChangeTrackingDiff {
  stats: {
    total: number;
    additions: number;
    deletions: number;
    updates: number;
  };
  fieldChanges: Array<string>;
  oldvalues: Record<string, any>;
  newvalues: Record<string, any>;
}
