/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationFn } from '@kbn/core-saved-objects-server';
import type {
  InvestigationStatus,
  InvestigationSubjectType,
  InvestigationTriggerType,
  Severity,
} from '../../../common';
import type { InvestigationAttributes } from '../../storage/types';

/**
 * V1 attribute shape — frozen here so this migration stays accurate even if the
 * live type changes. Mirrors `investigationAttributesSchemaV1`.
 */
interface InvestigationAttributesV1 {
  status: InvestigationStatus;
  subject_type: InvestigationSubjectType;
  subject_id: string;
  subject_summary?: string;
  trigger_type: InvestigationTriggerType;
  concurrency_key?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  summary?: string;
  conclusion?: string;
  severity?: Severity;
  hypotheses?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  blind_spots?: Array<Record<string, unknown>>;
  trigger_feedback?: Array<Record<string, unknown>>;
  conversation_id?: string;
  impact?: { entities: Array<Record<string, unknown>> };
}

/**
 * Renames all snake_case investigation attribute keys to camelCase.
 *
 * Legacy keys are removed rather than retained. The v1 schema's
 * `forwardCompatibility: extends({}, { unknowns: 'ignore' })` means a
 * rolled-back node reads a migrated document without validation errors —
 * the unrecognised camelCase keys are silently discarded, and the required
 * fields that the node still expects were never in the v1 schema for the
 * camelCase side, so no field goes missing for that node.
 */
export const migrateInvestigationKeysToCamelCase: SavedObjectModelTransformationFn<
  InvestigationAttributesV1,
  InvestigationAttributes
> = (doc) => {
  const {
    subject_type: subjectType,
    subject_id: subjectId,
    subject_summary: subjectSummary,
    trigger_type: triggerType,
    concurrency_key: concurrencyKey,
    created_at: createdAt,
    started_at: startedAt,
    completed_at: completedAt,
    executed_by: executedBy,
    conversation_id: conversationId,
    blind_spots: blindSpots,
    trigger_feedback: triggerFeedback,
    // unchanged fields
    status,
    error,
    summary,
    conclusion,
    severity,
    hypotheses,
    recommendations,
    impact,
  } = doc.attributes;

  return {
    document: {
      ...doc,
      attributes: {
        status,
        subjectType,
        subjectId,
        ...(subjectSummary !== undefined ? { subjectSummary } : {}),
        triggerType,
        ...(concurrencyKey !== undefined ? { concurrencyKey } : {}),
        createdAt,
        ...(startedAt !== undefined ? { startedAt } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        ...(executedBy !== undefined ? { executedBy } : {}),
        ...(error !== undefined ? { error } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(conclusion !== undefined ? { conclusion } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(hypotheses !== undefined ? { hypotheses } : {}),
        ...(recommendations !== undefined ? { recommendations } : {}),
        ...(blindSpots !== undefined ? { blindSpots } : {}),
        ...(triggerFeedback !== undefined ? { triggerFeedback } : {}),
        ...(conversationId !== undefined ? { conversationId } : {}),
        ...(impact !== undefined ? { impact } : {}),
      },
    },
  };
};
