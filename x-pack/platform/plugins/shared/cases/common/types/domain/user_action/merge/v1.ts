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

/** Attachment counts by kind for one original case. */
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
    /** What the case added to the destination. */
    copied: MergeCopiedTotalsSchema,
    /**
     * What the case held that the destination or an earlier case already had. Missing on merges
     * recorded before it was tracked.
     */
    duplicates: MergeCopiedTotalsSchema.optional(),
    /** What the user chose to leave on the case. Missing on merges recorded before it was tracked. */
    excluded: MergeCopiedTotalsSchema.optional(),
  })
);

/**
 * The same payload is written on the destination and on every original case; the UI picks the
 * wording by comparing the case it renders with `destination.id`.
 */
export const MergeUpdatedFieldSchema = lazySchema(() =>
  z.enum(['title', 'description', 'severity', 'category', 'tags', 'assignees'])
);

export const MergePayloadSchema = lazySchema(() =>
  z.object({
    destination: MergeCaseSnapshotSchema,
    sources: z.array(MergeSourceSchema),
    closedSources: z.boolean(),
    /**
     * Fields the merge changed on an existing destination. The merge entry is the destination's
     * only record of them. Missing on merges recorded before it was tracked.
     */
    updatedFields: z.array(MergeUpdatedFieldSchema).optional(),
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
export type MergeUpdatedField = z.infer<typeof MergeUpdatedFieldSchema>;
export type MergePayload = z.infer<typeof MergePayloadSchema>;
