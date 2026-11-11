/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import {
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
} from './constants';

/** Identifies the workflow plus the specific execution to link to. */
export const WorkflowPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  executionId: z.string(),
});

/**
 * The activity origin: what the user was looking at when they triggered the workflow run.
 *
 * This is a discriminated union so each variant carries only the enrichment fields that
 * `buildActivityOrigin` actually writes for that type. A `cases.case` origin never carries
 * `index`, `typeKey`, or `value`; a `cases.observable` origin never carries `index`.
 *
 * - `cases.case`        — triggered from the case detail page.
 * - `cases.observable`  — triggered from the observables table for a specific observable;
 *                         carries optional `typeKey` + `value` for display.
 * - `cases.observables` — triggered from the observables table with a multi-observable selection;
 *                         carries optional `count` for display in the activity feed.
 * - `cases.attachment`  — triggered from one registered attachment target; carries its
 *                         normalized attachment type and optional index.
 * - `cases.attachments` — triggered from a registered attachment bulk surface; carries its
 *                         normalized attachment type and optional count.
 */
export const WorkflowOriginSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(CASE_WORKFLOW_ORIGIN_TYPE),
    /** The primary identifier: caseId. */
    id: z.string(),
  }),
  z.object({
    type: z.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
    /** The primary identifier: observableId. */
    id: z.string(),
    /** The observable type key (e.g. 'ip', 'url'). */
    typeKey: z.string().optional(),
    /** The observable value for display. */
    value: z.string().optional(),
  }),
  z.object({
    type: z.literal(OBSERVABLES_WORKFLOW_ORIGIN_TYPE),
    /** The primary identifier: caseId. */
    id: z.string(),
    /** Number of observables in the selection, for display in the activity feed. */
    count: z.number().optional(),
  }),
  z.object({
    type: z.literal(ATTACHMENT_WORKFLOW_ORIGIN_TYPE),
    /** The primary identifier: attachmentId. */
    id: z.string(),
    /** The normalized registered attachment type. */
    attachmentType: z.string(),
    /** Optional ES index used by document-backed attachment actions. */
    index: z.string().optional(),
  }),
  z.object({
    type: z.literal(ATTACHMENTS_WORKFLOW_ORIGIN_TYPE),
    /** The primary identifier: caseId. */
    id: z.string(),
    /** The normalized registered attachment type. */
    attachmentType: z.string(),
    /** Number of selected attachment targets. */
    count: z.number().optional(),
  }),
]);

export const WorkflowUserActionPayloadSchema = z.object({
  workflow: WorkflowPayloadSchema,
  origin: WorkflowOriginSchema.optional(),
});

export const WorkflowUserActionSchema = z.object({
  type: z.literal(UserActionTypes.workflow),
  payload: WorkflowUserActionPayloadSchema,
});

export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>;
export type WorkflowOrigin = z.infer<typeof WorkflowOriginSchema>;
export type WorkflowUserActionPayload = z.infer<typeof WorkflowUserActionPayloadSchema>;
