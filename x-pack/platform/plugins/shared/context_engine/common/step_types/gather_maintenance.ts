/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema, MAX_KI_ID_LENGTH } from './ki';

export const GATHER_MAINTENANCE_STEP_ID = 'context-engine.gatherMaintenance' as const;

/** How many items the model reviews at once. */
export const MAINTENANCE_BATCH_SIZE = 20;
/** How many changed items one run reads; the rest wait for the next run. */
export const MAINTENANCE_CHANGED_PAGE_SIZE = 300;
/** The memories an item that lost some is rewritten from, at most. */
export const MAX_MAINTENANCE_REMAINING_MEMORIES = 10;
/** The newest facts about an entity its summary is refreshed from, at most. */
export const MAX_MAINTENANCE_ABOUT_FACTS = 50;
export const MAX_MAINTENANCE_BATCHES = 100;
export const MAX_MAINTENANCE_LISTED_CHANGES = 1000;
/** Neighbors, facts and relationships one batch shows, at most, of each. */
export const MAX_BATCH_RELATED = 500;
/** Facts and entities one run may tombstone, however few it reviews. */
export const MIN_MAINTENANCE_TOMBSTONES = 3;
const MAX_TIMESTAMP_LENGTH = 64;

export const MAINTENANCE_REVIEW_REASONS = [
  'changed',
  'lost_sources',
  'about_facts_changed',
  'sweep',
] as const;
export type MaintenanceReviewReason = (typeof MAINTENANCE_REVIEW_REASONS)[number];

const idSchema = lazySchema(() => z.string().max(MAX_KI_ID_LENGTH));

/** A fact or entity as the maintenance model reads it. */
export const maintenanceItemSchema = lazySchema(() =>
  z.object({
    id: idSchema,
    kind: z.enum(['fact', 'entity']),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    occurrences: z.number().describe('How many memories it was seen in'),
    last_seen_at: z.string().optional().describe('When the latest memory it was seen in was saved'),
    person_edited: z
      .boolean()
      .optional()
      .describe('A person edited it: its text is kept and it is never removed'),
  })
);

export type MaintenanceItem = z.infer<typeof maintenanceItemSchema>;

export const maintenanceReviewItemSchema = lazySchema(() =>
  maintenanceItemSchema.extend({
    reasons: z.array(z.enum(MAINTENANCE_REVIEW_REASONS)).describe('Why it is reviewed'),
    neighbor_ids: z.array(idSchema).optional().describe('The most similar items of its kind'),
    about_fact_ids: z
      .array(idSchema)
      .optional()
      .describe('For an entity, the facts about it, newest first'),
    lost_source_ids: z
      .array(idSchema)
      .optional()
      .describe('The memories it came from that were deleted'),
    remaining_memories: z
      .array(z.object({ id: idSchema, title: z.string().optional(), content: z.string() }))
      .max(MAX_MAINTENANCE_REMAINING_MEMORIES)
      .optional()
      .describe('The memories it came from that remain, to rewrite it from'),
  })
);

export type MaintenanceReviewItem = z.infer<typeof maintenanceReviewItemSchema>;

export const maintenanceRelationshipSchema = lazySchema(() =>
  z.object({
    id: idSchema,
    from: idSchema,
    relation: z.string(),
    to: idSchema,
    description: z.string().optional(),
  })
);

export type MaintenanceRelationship = z.infer<typeof maintenanceRelationshipSchema>;

/** Items of one audience the model reviews together, with what it needs to judge them. */
export const maintenanceBatchSchema = lazySchema(() =>
  z.object({
    audience: z.string().describe('Who can see every item of the batch'),
    items: z.array(maintenanceReviewItemSchema).max(MAINTENANCE_BATCH_SIZE),
    neighbors: z
      .array(maintenanceItemSchema)
      .max(MAX_BATCH_RELATED)
      .describe('Similar items the reviewed ones may duplicate or contradict'),
    about_facts: z
      .array(maintenanceItemSchema)
      .max(MAX_BATCH_RELATED)
      .describe('Facts about the reviewed entities'),
    relationships: z
      .array(maintenanceRelationshipSchema)
      .max(MAX_BATCH_RELATED)
      .describe('Relationships touching the reviewed items or their neighbors'),
  })
);

export type MaintenanceBatch = z.infer<typeof maintenanceBatchSchema>;

export const MAINTENANCE_CHANGES = [
  'merged',
  'superseded',
  'rewritten',
  'summarized',
  'tombstoned',
  'needs_review',
] as const;

/** One change maintenance made or would make, or one it left for a person. */
export const maintenanceChangeSchema = lazySchema(() =>
  z.object({
    id: idSchema,
    change: z.enum(MAINTENANCE_CHANGES),
    reason: z.string(),
  })
);

export type MaintenanceChange = z.infer<typeof maintenanceChangeSchema>;

export const gatherMaintenanceInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    since: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .describe('Review the items and memories changed after this ISO 8601 time'),
    after_id: idSchema
      .optional()
      .describe('With since: also those changed exactly at since, with a greater id'),
    sweep_after_id: idSchema
      .optional()
      .describe('Sweep the items with a greater id. Empty: start from the first item'),
  })
);

export const gatherMaintenanceOutputSchema = lazySchema(() =>
  z.object({
    reviewed: z.number().describe('Items in the batches'),
    max_tombstones: z
      .number()
      .describe('Facts and entities this run may tombstone before it stops for review'),
    batches: z.array(maintenanceBatchSchema).max(MAX_MAINTENANCE_BATCHES),
    fixes: z
      .array(maintenanceChangeSchema)
      .max(MAX_MAINTENANCE_LISTED_CHANGES)
      .describe('Items and relationships to tombstone without asking the model'),
    needs_review: z
      .array(maintenanceChangeSchema)
      .max(MAX_MAINTENANCE_LISTED_CHANGES)
      .describe('Items left for a person, each with why'),
    counts: z.object({
      changed: z.number(),
      lost_sources: z.number(),
      about_facts_changed: z.number(),
      sweep: z.number(),
    }),
    resume_from: z
      .string()
      .describe('Where the next run reads changes from, when this run did not read them all'),
    resume_after_id: z.string(),
    sweep_after_id: z.string().describe('Where the next sweep starts; empty to start over'),
  })
);

export type GatherMaintenanceOutput = z.infer<typeof gatherMaintenanceOutputSchema>;

export const gatherMaintenanceStepCommonDefinition: CommonStepDefinition<
  typeof gatherMaintenanceInputSchema,
  typeof gatherMaintenanceOutputSchema
> = {
  id: GATHER_MAINTENANCE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.gatherMaintenance.label', {
    defaultMessage: 'Gather memory to maintain',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.gatherMaintenance.description', {
    defaultMessage:
      'Read the facts and entities of an AI index that memory maintenance should review.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: gatherMaintenanceInputSchema,
  outputSchema: gatherMaintenanceOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.gatherMaintenance.documentation.details',
      {
        defaultMessage:
          'Reads the facts and entities that changed since the last run, those whose memories ' +
          'were deleted, the entities whose facts changed, and a slice of the rest in id order, ' +
          'so every item is reviewed in time. Each comes with its most similar items, its ' +
          'relationships and, for an entity, the facts about it, in batches of one audience. ' +
          'Items whose memories were all deleted, and relationships that link a deleted item or ' +
          'whose permissions differ from their ends, are listed as fixes. Items a person ' +
          'edited, or that also came from traces, are listed for review instead of rewritten.',
      }
    ),
  },
};
