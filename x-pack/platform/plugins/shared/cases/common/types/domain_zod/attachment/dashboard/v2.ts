/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { dashboardAttachmentDataSchema } from '@kbn/dashboard-agent-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/**
 * Dashboard attachments are value-typed and always carry a saved-object id.
 * Unlike lens, there is no legacy persistable form to discriminate against —
 * a dashboard is either rendered inline from a snapshotted `config`
 * (`DashboardAttachmentData`, the dashboard-as-code shape produced by
 * `@kbn/dashboard-agent`) or, when no snapshot is available, falls back to a
 * title-only event. `config` is fetched at attach-time when possible.
 */

const TimeRangeSchema = z.object({ from: z.string(), to: z.string() }).strict();

export const DashboardAttachmentDataSchema = z
  .object({
    savedObjectId: z.string(),
    /** Cached at attach-time so the event can render without an extra fetch. */
    title: z.string().optional(),
    /** Snapshot of the dashboard-as-code state for inline rendering. */
    config: dashboardAttachmentDataSchema.optional(),
    /** Optional override for the dashboard's stored time range. */
    timeRange: TimeRangeSchema.optional(),
  })
  .strict();

export type DashboardAttachmentData = z.infer<typeof DashboardAttachmentDataSchema>;

export const DashboardAttachmentPayloadSchema = z
  .object({
    type: z.literal(DASHBOARD_ATTACHMENT_TYPE),
    owner: z.string(),
    data: DashboardAttachmentDataSchema,
  })
  .strict();

export type DashboardAttachmentPayload = z.infer<typeof DashboardAttachmentPayloadSchema>;

/** Renderer narrowing helper: snapshot present ⇒ render the dashboard inline. */
export const hasDashboardConfig = (
  data: DashboardAttachmentData
): data is DashboardAttachmentData & { config: NonNullable<DashboardAttachmentData['config']> } =>
  data.config !== undefined;
