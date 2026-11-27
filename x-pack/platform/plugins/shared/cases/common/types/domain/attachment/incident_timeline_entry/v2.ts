/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_TITLE_LENGTH } from '../../../../constants';

export const MAX_INCIDENT_TIMELINE_ENTRY_TITLE_LENGTH = 160;
export const MAX_INCIDENT_TIMELINE_ENTRY_CONTENT_LENGTH = 5000;
const MAX_TIME_LENGTH = 50;
const MAX_ALERT_ID_LENGTH = 512;
const MAX_ALERT_INDEX_LENGTH = 1024;

export const INCIDENT_TIMELINE_ENTRY_CATEGORIES = [
  'actor',
  'external',
  'internal',
  'info',
] as const;

export type IncidentTimelineEntryCategory = (typeof INCIDENT_TIMELINE_ENTRY_CATEGORIES)[number];

const UtcTimeSchema = lazySchema(() => z.iso.datetime().max(MAX_TIME_LENGTH));

export const IncidentTimelineEntryDataSchema = lazySchema(() =>
  z
    .object({
      title: z
        .string()
        .max(MAX_INCIDENT_TIMELINE_ENTRY_TITLE_LENGTH)
        .refine((value) => value.trim().length > 0, { message: 'Title must not be empty' }),
      content: z.string().max(MAX_INCIDENT_TIMELINE_ENTRY_CONTENT_LENGTH).optional(),
      occurredAt: UtcTimeSchema,
      endAt: UtcTimeSchema.optional(),
      category: z.enum(INCIDENT_TIMELINE_ENTRY_CATEGORIES).optional(),
      alert: z
        .object({
          id: z.string().min(1).max(MAX_ALERT_ID_LENGTH),
          index: z.string().min(1).max(MAX_ALERT_INDEX_LENGTH),
        })
        .strict()
        .optional(),
    })
    .strict()
    .refine(
      ({ occurredAt, endAt }) => endAt === undefined || Date.parse(endAt) >= Date.parse(occurredAt),
      { message: 'endAt must not be before occurredAt', path: ['endAt'] }
    )
);

export type IncidentTimelineEntryData = z.infer<typeof IncidentTimelineEntryDataSchema>;

export const IncidentTimelineEntryPayloadSchema = lazySchema(() =>
  z
    .object({
      type: z.literal(INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE),
      owner: z.string().max(MAX_TITLE_LENGTH),
      data: IncidentTimelineEntryDataSchema,
    })
    .strict()
);

export type IncidentTimelineEntryPayload = z.infer<typeof IncidentTimelineEntryPayloadSchema>;
