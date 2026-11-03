/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  CASE_STATUS_CATEGORIES,
  CASE_STATUS_COLORS,
  MAX_CASE_STATUSES,
  MAX_CASE_STATUS_KEY_LENGTH,
  MAX_CASE_STATUS_LABEL_LENGTH,
} from '../../../constants/statuses';

/**
 * The hidden lifecycle a status belongs to. It decides closing, reopening, alert sync, metrics,
 * and push, and maps to the public `status` field: not_started → open, active → in-progress,
 * done → closed.
 */
export const CaseStatusCategorySchema = lazySchema(() => z.enum(CASE_STATUS_CATEGORIES));

export const CaseStatusKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_CASE_STATUS_KEY_LENGTH)
    .regex(/^[a-z0-9_-]+$/)
);

export const CaseStatusDefinitionSchema = lazySchema(() =>
  z.object({
    /** Immutable id stored on cases as `status_key`. */
    key: CaseStatusKeySchema,
    label: z.string().trim().min(1).max(MAX_CASE_STATUS_LABEL_LENGTH),
    /** An EUI badge color, readable in both themes. */
    color: z.enum(CASE_STATUS_COLORS),
    category: CaseStatusCategorySchema,
    order: z.number().int().min(0),
    /** Exactly one enabled default per category: where `status`-only writes land. */
    isDefault: z.boolean(),
    disabled: z.boolean(),
  })
);

/** Space-level Cases settings, stored in the `cases-space-settings` saved object. */
export const CasesSpaceSettingsSchema = lazySchema(() =>
  z.object({
    statuses: z.array(CaseStatusDefinitionSchema).max(MAX_CASE_STATUSES),
  })
);

export type CaseStatusCategory = z.infer<typeof CaseStatusCategorySchema>;
export type CaseStatusDefinition = z.infer<typeof CaseStatusDefinitionSchema>;
export type CasesSpaceSettings = z.infer<typeof CasesSpaceSettingsSchema>;
