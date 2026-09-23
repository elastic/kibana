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
  KiVerification: `${TELEMETRY_PREFIX}_ki_verification`,
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

export interface ReportKiVerificationEventParams {
  outcome: ContextEngineOutcome;
  passed?: boolean;
  verifiers_run?: number;
  failed_verifier_ids?: string[];
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
        description: 'Verifier id, verbatim.',
      },
    },
    _meta: {
      description: 'Failing verifier ids. Present only when a completed run failed verification.',
      optional: true,
    },
  },
};

const KI_VERIFICATION_EVENT: EventTypeOpts<ReportKiVerificationEventParams> = {
  eventType: CONTEXT_ENGINE_EVENT_TYPES.KiVerification,
  schema: kiVerificationEventSchema,
};

export const contextEngineServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  KI_CREATE_EVENT,
  KI_UPDATE_EVENT,
  KI_DELETE_EVENT,
  KI_VERIFICATION_EVENT,
];
