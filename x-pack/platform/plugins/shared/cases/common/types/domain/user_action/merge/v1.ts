/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

/** A point-in-time snapshot of a case involved in a merge, so the activity entry survives renames. */
export const MergeCaseSnapshotSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    incrementalId: z.number().nullable().optional(),
  })
);

/** How many attachments of each kind were copied from one original case. */
export const MergeCopiedTotalsSchema = lazySchema(() =>
  z.object({
    alerts: z.number(),
    events: z.number(),
    observables: z.number(),
    other: z.number(),
  })
);

export const MergeSourceSchema = lazySchema(() =>
  MergeCaseSnapshotSchema.extend({
    copied: MergeCopiedTotalsSchema,
  })
);

/**
 * The same payload is written on the destination and on every original case; the UI picks the
 * wording by comparing the case it renders with `destination.id`.
 */
export const MergePayloadSchema = lazySchema(() =>
  z.object({
    destination: MergeCaseSnapshotSchema,
    sources: z.array(MergeSourceSchema),
    closedSources: z.boolean(),
  })
);

export const MergeUserActionPayloadSchema = lazySchema(() =>
  z.object({
    merge: MergePayloadSchema,
  })
);

export const MergeUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.merge),
    payload: MergeUserActionPayloadSchema,
  })
);

export type MergeCaseSnapshot = z.infer<typeof MergeCaseSnapshotSchema>;
export type MergeCopiedTotals = z.infer<typeof MergeCopiedTotalsSchema>;
export type MergeSource = z.infer<typeof MergeSourceSchema>;
export type MergePayload = z.infer<typeof MergePayloadSchema>;
