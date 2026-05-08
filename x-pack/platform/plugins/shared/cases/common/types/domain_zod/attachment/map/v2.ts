/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAP_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/**
 * Map attachments are value-typed and always carry a saved-object id. There is
 * no legacy persistable form to discriminate against — a map is either
 * rendered inline from a verbatim snapshot of the SO `attributes` (taken at
 * attach-time) or, when no snapshot is available, falls back to a title-only
 * event. Mirrors the dashboard/lens SO-by-ref shape.
 */

const TimeRangeSchema = z.object({ from: z.string(), to: z.string() }).strict();

export const MapAttachmentDataSchema = z
  .object({
    savedObjectId: z.string(),
    /** Cached at attach-time so the event can render without an extra fetch. */
    title: z.string().optional(),
    /** Verbatim `MapAttributes` snapshot (layers, settings, center, …). */
    attributes: z.record(z.string(), z.unknown()).optional(),
    /** Optional override for the map's stored time range. */
    timeRange: TimeRangeSchema.optional(),
  })
  .strict();

export type MapAttachmentData = z.infer<typeof MapAttachmentDataSchema>;

export const MapAttachmentPayloadSchema = z
  .object({
    type: z.literal(MAP_ATTACHMENT_TYPE),
    owner: z.string(),
    data: MapAttachmentDataSchema,
  })
  .strict();

export type MapAttachmentPayload = z.infer<typeof MapAttachmentPayloadSchema>;

/** Renderer narrowing helper: snapshot present ⇒ render the map inline. */
export const hasMapAttributes = (
  data: MapAttachmentData
): data is MapAttachmentData & { attributes: NonNullable<MapAttachmentData['attributes']> } =>
  data.attributes !== undefined;
