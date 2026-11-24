/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, ExtractionMode } from '../../../common/domain/definitions/entity_schema';

export type SystemEventKind = 'run' | 'lifecycle' | 'summary';
export type SystemEventOutcome = 'success' | 'failure';
export type SystemEventTrigger = 'task' | 'user' | 'system';

export const SYSTEM_EVENT_ACTION = {
  extraction: 'extraction',
  historySnapshot: 'history_snapshot',
  maintainer: 'maintainer',
} as const;

export const SYSTEM_EVENT_REASON = {
  aborted: 'aborted',
} as const;

export interface SystemEventDoc {
  '@timestamp': string;
  event: {
    kind: SystemEventKind;
    action: string;
    outcome?: SystemEventOutcome;
    reason?: string;
    /** Nanoseconds, as in ECS. */
    duration?: number;
  };
  error?: { message: string };
  entity_store: {
    namespace: string;
    trigger?: SystemEventTrigger;
    task_type?: string;
    execution_uuid?: string;
    entity_type?: EntityType;
    mode?: ExtractionMode;
    maintainer_id?: string;
    extraction?: {
      count: number;
      pages: number;
      logs_processed: number;
      logs_cap_applied: boolean;
    };
    history_snapshot?: { doc_count: number };
    summary?: {
      runs: number;
      failures: number;
      aborted: number;
      entities: number;
      logs_processed: number;
      cap_applied_runs: number;
      duration_p50_ms: number | null;
      duration_p95_ms: number | null;
      duration_max_ms: number | null;
      last_error?: string;
    };
  };
}

/** Common run fields. The writer adds `namespace`, `event.kind` and `event.duration`. */
export interface RunEventInput {
  action: string;
  startedAt: number;
  endedAt?: number;
  outcome: SystemEventOutcome;
  reason?: string;
  error?: unknown;
  trigger: SystemEventTrigger;
  taskType?: string;
  executionUuid?: string;
  entityType?: EntityType;
  mode?: ExtractionMode;
  maintainerId?: string;
  extraction?: NonNullable<SystemEventDoc['entity_store']['extraction']>;
  historySnapshot?: NonNullable<SystemEventDoc['entity_store']['history_snapshot']>;
}
