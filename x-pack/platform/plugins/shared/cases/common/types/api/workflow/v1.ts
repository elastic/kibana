/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  MAX_CASES_PER_WORKFLOW_RUN,
  MAX_CASE_WORKFLOW_RUN_ID_LENGTH,
  MAX_WORKFLOW_INPUT_KEY_LENGTH,
  MAX_WORKFLOW_INPUTS_BYTES,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../constants';

const idField = z.string().min(1).max(MAX_CASE_WORKFLOW_RUN_ID_LENGTH);

/**
 * Identifies where the user was when they triggered the workflow run.
 * Each variant is a discriminated union member and carries only the identifiers
 * relevant to that surface — no overloaded `id` field.
 *
 * - `cases.case`       — triggered from the case detail page.
 * - `cases.observable` — triggered from the observables table for a specific observable.
 * - `cases.alert`      — triggered from the alerts table for a single alert.
 * - `cases.alerts`     — triggered from the alerts table with a multi-alert selection.
 *
 * `origin` is **optional** on the request. When absent the run is treated as a
 * list-surface (bulk) run: the caller was not looking at any specific sub-entity,
 * the full case set is described by `caseIds`, and alert inputs are not permitted.
 *
 * The API schema carries identifiers only. Display enrichment (alert index, observable
 * typeKey/value) is derived server-side from the case at activity-write time so that
 * client-supplied label text cannot spoof the activity log.
 */
const CaseWorkflowRunOriginSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal(CASE_WORKFLOW_ORIGIN_TYPE),
      caseId: idField,
    })
    .strict(),
  z
    .object({
      type: z.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
      caseId: idField,
      observableId: idField,
    })
    .strict(),
  z
    .object({
      type: z.literal(ALERT_WORKFLOW_ORIGIN_TYPE),
      caseId: idField,
      alertId: idField,
    })
    .strict(),
  z
    .object({
      type: z.literal(ALERTS_WORKFLOW_ORIGIN_TYPE),
      caseId: idField,
    })
    .strict(),
]);

export type CaseWorkflowRunOrigin = z.infer<typeof CaseWorkflowRunOriginSchema>;

export const CasesWorkflowExecutionMetadataSchema = z
  .object({
    schemaVersion: z.literal(CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION),
    source: z.literal(CASES_WORKFLOW_EXECUTION_SOURCE),
    caseIds: z
      .array(z.string().min(1).max(MAX_CASE_WORKFLOW_RUN_ID_LENGTH))
      .min(1)
      .max(MAX_CASES_PER_WORKFLOW_RUN),
    origin: CaseWorkflowRunOriginSchema.optional(),
  })
  .strict();

export type CasesWorkflowExecutionMetadata = z.infer<typeof CasesWorkflowExecutionMetadataSchema>;

export const RunCaseWorkflowRequestSchema = z
  .object({
    caseIds: z
      .array(idField)
      .min(1)
      .max(MAX_CASES_PER_WORKFLOW_RUN)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'caseIds must not contain duplicates.',
      }),
    inputs: z
      .record(z.string().max(MAX_WORKFLOW_INPUT_KEY_LENGTH), z.unknown())
      .refine(
        (inputs) =>
          new TextEncoder().encode(JSON.stringify(inputs)).length <= MAX_WORKFLOW_INPUTS_BYTES,
        { message: `Workflow inputs cannot exceed ${MAX_WORKFLOW_INPUTS_BYTES} bytes.` }
      ),
    origin: CaseWorkflowRunOriginSchema.optional(),
  })
  .strict();

export type RunCaseWorkflowRequest = z.infer<typeof RunCaseWorkflowRequestSchema>;

export const RunCaseWorkflowResponseSchema = z
  .object({
    workflowExecutionId: z.string(),
  })
  .strict();

export type RunCaseWorkflowResponse = z.infer<typeof RunCaseWorkflowResponseSchema>;
