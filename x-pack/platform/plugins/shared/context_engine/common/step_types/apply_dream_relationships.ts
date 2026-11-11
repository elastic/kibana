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
import { MAX_DREAMING_CHANGE_SET_ITEMS } from '../dreaming';
import {
  dreamingMemoriesSchema,
  plannedDocumentSchema,
  plannedWriteSchema,
  refSchema,
  rejectedItemSchema,
  typeSchema,
} from './apply_dream_changes';
import { aiIndexIdSchema, MAX_KI_DESCRIPTION_LENGTH } from './ki';

export const APPLY_DREAM_RELATIONSHIPS_STEP_ID = 'context-engine.applyDreamRelationships' as const;

/** Relationships between facts and entities the dreaming model creates, updates or deletes. */
export const dreamRelationshipChangeSetSchema = lazySchema(() =>
  z.object({
    relationships: z
      .array(
        z.object({
          from: refSchema,
          to: refSchema,
          relation: typeSchema,
          description: z.string().max(MAX_KI_DESCRIPTION_LENGTH).optional(),
          delete: z.boolean().optional(),
        })
      )
      .max(MAX_DREAMING_CHANGE_SET_ITEMS)
      .default([]),
  })
);

export type DreamRelationshipChangeSet = z.infer<typeof dreamRelationshipChangeSetSchema>;

export const applyDreamRelationshipsInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    memories: dreamingMemoriesSchema.describe(
      'The memories of the batch, as read from the AI index. They must all have the same permissions. A relationship is based on the ones its two ends cite, and is skipped when neither end cites any.'
    ),
    changes: dreamRelationshipChangeSetSchema.describe(
      'The relationship changes the dreaming model returned'
    ),
    documents: z
      .array(plannedDocumentSchema)
      .max(MAX_DREAMING_CHANGE_SET_ITEMS * 2)
      .optional()
      .describe(
        'On a dry run, the facts and entities the extraction step would write, so relationships can link them before they are stored'
      ),
    dry_run: z
      .boolean()
      .optional()
      .describe('Check and resolve the changes and report what they would write, without writing.'),
  })
);

export const applyDreamRelationshipsOutputSchema = lazySchema(() =>
  z.object({
    created: z.number().describe('Relationships created'),
    updated: z.number().describe('Relationships updated'),
    deleted: z.number().describe('Relationships deleted'),
    rejected: z
      .array(rejectedItemSchema)
      .describe('Relationships that were not applied, each with why'),
    would_write: z
      .array(plannedWriteSchema)
      .optional()
      .describe('On a dry run, each relationship it would write; nothing is stored'),
  })
);

export type ApplyDreamRelationshipsOutput = z.infer<typeof applyDreamRelationshipsOutputSchema>;

export const applyDreamRelationshipsStepCommonDefinition: CommonStepDefinition<
  typeof applyDreamRelationshipsInputSchema,
  typeof applyDreamRelationshipsOutputSchema
> = {
  id: APPLY_DREAM_RELATIONSHIPS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyDreamRelationships.label', {
    defaultMessage: 'Apply dreamed relationships',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.applyDreamRelationships.description',
    {
      defaultMessage:
        'Write the relationships a dreaming model proposed between facts and entities into an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyDreamRelationshipsInputSchema,
  outputSchema: applyDreamRelationshipsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyDreamRelationships.documentation.details',
      {
        defaultMessage:
          'Checks each relationship against the relationship types in the dreaming config of the ' +
          'AI index, and writes it as a memory.relationship KI linking its two ends. A configured ' +
          'type links two existing entities; the built-in type about links a fact to an entity ' +
          'it is about. The relationship type is stored as ' +
          'attributes["relationship.relation"], and attributes["memory.key"] holds ' +
          'the from id, relationship type and to id, joined by "|". Proposing a relationship again updates it. ' +
          'A relationship that breaks a rule is rejected and the rest still apply. A dry run ' +
          'reports what it would write and writes nothing.',
      }
    ),
  },
};
