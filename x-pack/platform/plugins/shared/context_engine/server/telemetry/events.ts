/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

const TELEMETRY_PREFIX = 'context_engine';

export const CONTEXT_ENGINE_EVENT_TYPES = {
  KiCreate: `${TELEMETRY_PREFIX}_ki_create`,
  KiUpdate: `${TELEMETRY_PREFIX}_ki_update`,
  KiDelete: `${TELEMETRY_PREFIX}_ki_delete`,
  KiRestore: `${TELEMETRY_PREFIX}_ki_restore`,
  KiVerification: `${TELEMETRY_PREFIX}_ki_verification`,
  MemoryMaintenanceRun: `${TELEMETRY_PREFIX}_memory_maintenance_run`,
} as const;

export type ContextEngineOutcome = 'success' | 'failure' | 'aborted';

export interface ReportKiWriteEventParams {
  ai_index_id: string;
  managed?: boolean;
  outcome: ContextEngineOutcome;
  error_type?: string;
}

const kiWriteEventSchema: RootSchema<ReportKiWriteEventParams> = {
  ai_index_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the AI index the KI write targets.',
      optional: false,
    },
  },
  managed: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the AI index is managed (registered from code). Absent when unknown, e.g. on most failures.',
      optional: true,
    },
  },
  outcome: {
    type: 'keyword',
    _meta: {
      description:
        'The write outcome: "success", "failure", or "aborted" when the run was cancelled.',
      optional: false,
    },
  },
  error_type: {
    type: 'keyword',
    _meta: {
      description:
        'Error type on failure: the error class name or workflow ExecutionError type; "unknown" otherwise.',
      optional: true,
    },
  },
};

const KI_CREATE_EVENT: EventTypeOpts<ReportKiWriteEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiCreate,
  schema: kiWriteEventSchema,
};

const KI_UPDATE_EVENT: EventTypeOpts<ReportKiWriteEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiUpdate,
  schema: kiWriteEventSchema,
};

const KI_DELETE_EVENT: EventTypeOpts<ReportKiWriteEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiDelete,
  schema: kiWriteEventSchema,
};

const KI_RESTORE_EVENT: EventTypeOpts<ReportKiWriteEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiRestore,
  schema: kiWriteEventSchema,
};

export interface ReportKiVerificationEventParams {
  outcome: ContextEngineOutcome;
  passed?: boolean;
  verifiers_run?: number;
  failed_verifier_ids?: string[];
  failed_workflow_verifier_count?: number;
  workflow_id?: string;
  ai_index_id?: string;
  error_type?: string;
}

const kiVerificationEventSchema: RootSchema<ReportKiVerificationEventParams> = {
  outcome: {
    type: 'keyword',
    _meta: {
      description:
        'The run outcome: "success", "failure", or "aborted" when the run was cancelled.',
      optional: false,
    },
  },
  passed: {
    type: 'boolean',
    _meta: {
      description: 'Whether every applicable verifier passed. Present when the run completed.',
      optional: true,
    },
  },
  verifiers_run: {
    type: 'long',
    _meta: {
      description:
        'Number of verifiers that ran; 0 means the KI had nothing to verify. Present when the run completed.',
      optional: true,
    },
  },
  error_type: {
    type: 'keyword',
    _meta: {
      description:
        'Error type on failure: the error class name or workflow ExecutionError type; "unknown" otherwise.',
      optional: true,
    },
  },
  failed_verifier_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Verifier id: built-in ids verbatim; custom verifiers as "workflow:<id>".',
      },
    },
    _meta: {
      description:
        'Distinct failing verifier ids. Present only when a completed run failed verification.',
      optional: true,
    },
  },
  failed_workflow_verifier_count: {
    type: 'long',
    _meta: {
      description:
        'Number of custom verifier workflows that failed. Present when at least one failed.',
      optional: true,
    },
  },
  workflow_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the workflow that ran this verification.',
      optional: true,
    },
  },
  ai_index_id: {
    type: 'keyword',
    _meta: {
      description: 'The AI index the KI belongs to, when provided by the caller.',
      optional: true,
    },
  },
};

const KI_VERIFICATION_EVENT: EventTypeOpts<ReportKiVerificationEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiVerification,
  schema: kiVerificationEventSchema,
};

export interface ReportMemoryMaintenanceRunEventParams {
  ai_index_id: string;
  mode: 'report' | 'apply' | 'dry_run';
  braked: boolean;
  reviewed: number;
  written: number;
  merged: number;
  superseded: number;
  rewritten: number;
  summarized: number;
  tombstoned: number;
  needs_review: number;
  rejected: number;
}

const count = (description: string) =>
  ({ type: 'long', _meta: { description, optional: false } } as const);

const memoryMaintenanceRunEventSchema: RootSchema<ReportMemoryMaintenanceRunEventParams> = {
  ai_index_id: {
    type: 'keyword',
    _meta: { description: 'The id of the AI index the run maintained.', optional: false },
  },
  mode: {
    type: 'keyword',
    _meta: {
      description:
        'How the run ended: "report" planned changes only, "apply" wrote them, "dry_run" was a manual run that wrote nothing.',
      optional: false,
    },
  },
  braked: {
    type: 'boolean',
    _meta: {
      description: 'Whether the run stopped before writing because it would tombstone too much.',
      optional: false,
    },
  },
  reviewed: count('Facts and entities the model reviewed.'),
  written: count('Facts, entities and relationships written, or that would be.'),
  merged: count('Items other items were merged into.'),
  superseded: count('Items merged into another, or that lost a contradiction.'),
  rewritten: count('Items rewritten after some of their memories were deleted.'),
  summarized: count('Entities whose summary was refreshed.'),
  tombstoned: count(
    'Items whose memories were all deleted, and relationships that were broken, duplicate or inverse.'
  ),
  needs_review: count('Changes left for a person.'),
  rejected: count('Changes that broke a rule.'),
};

const MEMORY_MAINTENANCE_RUN_EVENT: EventTypeOpts<ReportMemoryMaintenanceRunEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.MemoryMaintenanceRun,
  schema: memoryMaintenanceRunEventSchema,
};

export const contextEngineServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  KI_CREATE_EVENT,
  KI_UPDATE_EVENT,
  KI_DELETE_EVENT,
  KI_RESTORE_EVENT,
  KI_VERIFICATION_EVENT,
  MEMORY_MAINTENANCE_RUN_EVENT,
];
