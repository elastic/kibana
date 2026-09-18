/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  DASHBOARD_ARTIFACT_TYPE,
  DEFAULT_ARTIFACT_DATA_FIELD_LIMIT,
  RUNBOOK_ARTIFACT_TYPE,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';

/**
 * Non-empty, non-blank string bounded by `max`. Rejects via refine rather than
 * `.trim()` so stored markdown is not rewritten on parse.
 */
const nonBlankString = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0);

/**
 * Per-type schemas for the fields an artifact type owns in `data`.
 *
 * Enforcement is opt-in: types absent from this map keep the generic bounds
 * only. Register a type here when its consumers rely on specific fields being
 * present and correctly typed.
 *
 * Declared fields are skipped by the generic per-field size pass so a type can
 * raise its own limit (e.g. runbook `content` at 50k) without the default 1024
 * rejecting first. Extra keys in `data` are left to that generic pass.
 */
export const ARTIFACT_DATA_SCHEMAS: Readonly<Record<string, z.ZodObject<z.ZodRawShape>>> = {
  [RUNBOOK_ARTIFACT_TYPE]: z.object({
    content: nonBlankString(RUNBOOK_CONTENT_LIMIT),
  }),
  [DASHBOARD_ARTIFACT_TYPE]: z.object({
    dashboardId: nonBlankString(DEFAULT_ARTIFACT_DATA_FIELD_LIMIT),
  }),
};
