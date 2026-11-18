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

/** Item counts by kind of attachment. Alerts and events count each referenced document. */
export const MergeCountsSchema = lazySchema(() =>
  z.object({
    alerts: z.number(),
    events: z.number(),
    attacks: z.number(),
    observables: z.number(),
    other: z.number(),
  })
);

/**
 * `merged`: every planned item was copied and the source links to the destination.
 * `notMerged`: a copy or the link failed, or another merge linked the source first.
 */
export const MergeSourceOutcomeSchema = lazySchema(() => z.enum(['merged', 'notMerged']));

export const MergeSourceSchema = lazySchema(() =>
  MergeCaseSnapshotSchema.extend({
    outcome: MergeSourceOutcomeSchema,
    /** Whether the merge closed the source. */
    closed: z.boolean(),
    /** What the source added to the destination. */
    copied: MergeCountsSchema,
    /** What the destination or an earlier source already held. */
    existing: MergeCountsSchema,
    /** What stays on the source: left out by the user or by the alert and license checks. */
    leftOut: MergeCountsSchema,
  })
);

/** A field the merge changed on an existing destination, with its label at merge time. */
export const MergeUpdatedFieldSchema = lazySchema(() =>
  z.object({
    field: z.enum([
      'title',
      'description',
      'severity',
      'category',
      'tags',
      'assignees',
      'connector',
      'template',
      'customFields',
      'extendedFields',
    ]),
    /** The custom field key or template field storage key. */
    key: z.string().optional(),
    label: z.string().optional(),
  })
);

/** A template field a source holds that the destination's template does not define. */
export const MergeNotCopiedFieldSchema = lazySchema(() =>
  z.object({
    key: z.string(),
    label: z.string(),
  })
);

/**
 * The same payload is written on the destination and on every source the merge linked; the UI
 * picks the wording by comparing the case it renders with `destination.id`.
 */
export const MergePayloadSchema = lazySchema(() =>
  z.object({
    destination: MergeCaseSnapshotSchema,
    sources: z.array(MergeSourceSchema),
    /** Fields the merge changed on an existing destination; the merge entry is their only record. */
    updatedFields: z.array(MergeUpdatedFieldSchema),
    notCopiedFields: z.array(MergeNotCopiedFieldSchema),
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
export type MergeCounts = z.infer<typeof MergeCountsSchema>;
export type MergeSourceOutcome = z.infer<typeof MergeSourceOutcomeSchema>;
export type MergeSource = z.infer<typeof MergeSourceSchema>;
export type MergeUpdatedField = z.infer<typeof MergeUpdatedFieldSchema>;
export type MergeNotCopiedField = z.infer<typeof MergeNotCopiedFieldSchema>;
export type MergePayload = z.infer<typeof MergePayloadSchema>;
