/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { CaseResponseProperties } from '../../bundled-types.gen';
import {
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_PAIRS,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OWNER_LENGTH,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MAX_TITLE_LENGTH,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../constants';

export const CASE_ATTACHMENT_TYPE = 'case' as const;
export const CASES_ATTACHMENT_TYPE = 'cases' as const;
export const OBSERVABLE_ATTACHMENT_TYPE = 'case_observable' as const;

export const caseAttachmentDataSchema = CaseResponseProperties.pick({
  id: true,
  incremental_id: true,
  title: true,
  description: true,
  status: true,
  severity: true,
  totalAlerts: true,
  totalComment: true,
  tags: true,
  owner: true,
  assignees: true,
  category: true,
  created_at: true,
  updated_at: true,
  total_observables: true,
}).extend({
  url: z.string().max(1000).nullable().optional(),
  totalAttachments: z.number().int().optional(),
  connector_name: z.string().max(500).nullable().optional(),
});
export type CaseAttachmentData = z.infer<typeof caseAttachmentDataSchema>;

export const CASES_ATTACHMENT_MAX = 20;

export const casesAttachmentDataSchema = z.object({
  cases: z.array(caseAttachmentDataSchema).max(CASES_ATTACHMENT_MAX),
  total: z.number().int(),
  url: z.string().max(1000).nullable().optional(),
});
export type CasesAttachmentData = z.infer<typeof casesAttachmentDataSchema>;

/** An observable of a case, with the metadata every case of the space holding its value shares. */
export const observableAttachmentDataSchema = lazySchema(() =>
  z.object({
    id: z.string().max(OBSERVABLE_ID_MAX_LENGTH),
    type_key: z.string().max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
    type_label: z.string().max(MAX_TITLE_LENGTH).optional(),
    // Stored values can predate the request bounds, so only the longest a stored one can be.
    value: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH),
    description: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH).nullable().optional(),
    metadata: z
      .record(
        z.string().max(MAX_OBSERVABLE_METADATA_KEY_LENGTH),
        z.string().max(MAX_OBSERVABLE_METADATA_VALUE_LENGTH)
      )
      .refine((metadata) => Object.keys(metadata).length <= MAX_OBSERVABLE_METADATA_PAIRS)
      .optional(),
    case_id: z.string().max(MAX_CASE_ID_LENGTH),
    case_title: z.string().max(MAX_TITLE_LENGTH),
    owner: z.string().max(MAX_OWNER_LENGTH),
    url: z.string().max(1000).nullable().optional(),
  })
);
export type ObservableAttachmentData = z.infer<typeof observableAttachmentDataSchema>;
