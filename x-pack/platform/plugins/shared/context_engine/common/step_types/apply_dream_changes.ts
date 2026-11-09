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
import { MAX_KI_CONTENT_LENGTH } from '../constants';
import {
  MAX_ACCESS_PATTERN_ESQL_LENGTH,
  MAX_ACCESS_PATTERN_LABEL_LENGTH,
  MAX_ACCESS_PATTERN_RETURNS_LENGTH,
  MAX_DREAMING_ACCESS_PATTERNS,
  MAX_DREAMING_CHANGE_SET_ITEMS,
  MAX_DREAMING_STEP_MEMORIES,
  MAX_DREAMING_TYPE_LENGTH,
} from '../dreaming';
import {
  aiIndexIdSchema,
  MAX_KI_ATTRIBUTE_KEY_LENGTH,
  MAX_KI_ATTRIBUTE_VALUE_LENGTH,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TITLE_LENGTH,
} from './ki';

export const APPLY_DREAM_CHANGES_STEP_ID = 'context-engine.applyDreamChanges' as const;

const MAX_SOURCE_IDS = 100;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_PRIVILEGE_GROUPS = 100;
const MAX_PRIVILEGE_NAMES = 50;
const MAX_PRIVILEGE_LENGTH = 256;

const refSchema = lazySchema(() => z.string().min(1).max(MAX_KI_ID_LENGTH));
const typeSchema = lazySchema(() => z.string().max(MAX_DREAMING_TYPE_LENGTH));
const sourceMemoryIdsSchema = lazySchema(() => z.array(refSchema).max(MAX_SOURCE_IDS));

export const accessPatternSchema = lazySchema(() =>
  z.object({
    question_type: z.string().min(1).max(MAX_ACCESS_PATTERN_LABEL_LENGTH),
    esql_template: z.string().min(1).max(MAX_ACCESS_PATTERN_ESQL_LENGTH),
    esql_example: z.string().min(1).max(MAX_ACCESS_PATTERN_ESQL_LENGTH),
    returns: z.string().min(1).max(MAX_ACCESS_PATTERN_RETURNS_LENGTH),
  })
);

export type AccessPattern = z.infer<typeof accessPatternSchema>;

const accessPatternsSchema = lazySchema(() =>
  z.array(accessPatternSchema).max(MAX_DREAMING_ACCESS_PATTERNS)
);

/** Entities, facts and relationships the dreaming model creates, updates or deletes. */
export const dreamChangeSetSchema = lazySchema(() =>
  z.object({
    entities: z
      .array(
        z.object({
          ref: refSchema,
          delete: z.boolean().optional(),
          type: typeSchema.optional(),
          name: z.string().max(MAX_KI_TITLE_LENGTH).optional(),
          description: z.string().max(MAX_KI_DESCRIPTION_LENGTH).optional(),
          content: z.string().max(MAX_KI_CONTENT_LENGTH).optional(),
          attributes: z
            .array(
              z.object({
                key: z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH),
                value: z.string().max(MAX_KI_ATTRIBUTE_VALUE_LENGTH),
              })
            )
            .max(MAX_DREAMING_CHANGE_SET_ITEMS)
            .optional(),
          access_patterns: accessPatternsSchema.optional(),
          source_memory_ids: sourceMemoryIdsSchema.optional(),
        })
      )
      .max(MAX_DREAMING_CHANGE_SET_ITEMS)
      .default([]),
    facts: z
      .array(
        z.object({
          ref: refSchema,
          delete: z.boolean().optional(),
          type: typeSchema.optional(),
          title: z.string().max(MAX_KI_TITLE_LENGTH).optional(),
          content: z.string().max(MAX_KI_CONTENT_LENGTH).optional(),
          about: z.array(refSchema).max(MAX_SOURCE_IDS).optional(),
          access_patterns: accessPatternsSchema.optional(),
          source_memory_ids: sourceMemoryIdsSchema.optional(),
        })
      )
      .max(MAX_DREAMING_CHANGE_SET_ITEMS)
      .default([]),
    relationships: z
      .array(
        z.object({
          type: typeSchema.min(1),
          source: refSchema,
          target: refSchema,
          remove: z.boolean().optional(),
          source_memory_ids: sourceMemoryIdsSchema.optional(),
        })
      )
      .max(MAX_DREAMING_CHANGE_SET_ITEMS)
      .default([]),
  })
);

export type DreamChangeSet = z.infer<typeof dreamChangeSetSchema>;

export const applyDreamChangesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    memories: z
      .array(
        z
          .object({
            id: refSchema,
            updated_at: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
            governance: z
              .object({
                lifecycle: z.object({ status: z.string().max(64).optional() }).optional(),
              })
              .optional(),
            permissions: z
              .object({
                kibana: z
                  .object({
                    privileges: z
                      .array(
                        z.object({
                          space: z.string().max(MAX_PRIVILEGE_LENGTH),
                          name: z
                            .array(z.string().max(MAX_PRIVILEGE_LENGTH))
                            .max(MAX_PRIVILEGE_NAMES)
                            .optional(),
                          count: z.number().optional(),
                        })
                      )
                      .max(MAX_PRIVILEGE_GROUPS)
                      .optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .passthrough()
      )
      .max(MAX_DREAMING_STEP_MEMORIES)
      .describe(
        'The memories the model was shown, as read from the AI index: the latest revision of each. Every item it writes must cite some of them, or memories the item already cites, and is visible only where they all are. Deleted ones are ignored.'
      ),
    changes: dreamChangeSetSchema.describe('The change set the dreaming model returned'),
    dry_run: z
      .boolean()
      .optional()
      .describe(
        'Check and resolve the change set and report what it would write, without writing. Each call is previewed on its own, without what earlier calls of the same run would write.'
      ),
  })
);

const rejectedItemSchema = lazySchema(() =>
  z.object({
    item: z.string().describe('Which item of the change set, such as `fact new:1`'),
    reason: z.string().describe('Why it was not applied'),
  })
);

const plannedWriteSchema = lazySchema(() =>
  z.object({
    id: z.string().describe('The KI id'),
    change: z.enum(['created', 'updated', 'deleted']),
    type: z.string().optional().describe('Absent when it would be deleted'),
    title: z.string().optional().describe('Absent when it would be deleted'),
  })
);

const plannedDocumentSchema = lazySchema(() =>
  z.object({ id: z.string(), type: z.string(), title: z.string() }).passthrough()
);

export const applyDreamChangesOutputSchema = lazySchema(() =>
  z.object({
    created: z.number().describe('Facts and entities created'),
    updated: z.number().describe('Facts and entities updated, relationships included'),
    deleted: z.number().describe('Facts and entities deleted'),
    rejected: z
      .array(rejectedItemSchema)
      .describe('Items of the change set that were not applied, each with why'),
    dropped_access_patterns: z
      .number()
      .describe('Access patterns dropped because their example query did not run'),
    would_write: z
      .array(plannedWriteSchema)
      .optional()
      .describe('On a dry run, each KI it would write; nothing is stored'),
    documents: z
      .array(plannedDocumentSchema)
      .optional()
      .describe('On a dry run, each KI it would create or update, as it would be stored'),
  })
);

export type ApplyDreamChangesOutput = z.infer<typeof applyDreamChangesOutputSchema>;

export const applyDreamChangesStepCommonDefinition: CommonStepDefinition<
  typeof applyDreamChangesInputSchema,
  typeof applyDreamChangesOutputSchema
> = {
  id: APPLY_DREAM_CHANGES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyDreamChanges.label', {
    defaultMessage: 'Apply dreamed memory changes',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.applyDreamChanges.description', {
    defaultMessage:
      'Write the facts, entities and relationships a dreaming model proposed into an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyDreamChangesInputSchema,
  outputSchema: applyDreamChangesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyDreamChanges.documentation.details',
      {
        defaultMessage:
          'Checks the change set against the dreaming config of the AI index, resolves new keys ' +
          'like "new:1" to stable ids, and writes each fact and entity as a KI typed by its ' +
          'configured type, such as fact.preference or entity.customer. Every item must cite ' +
          'the memories it is based on. ' +
          'An item that breaks a rule is rejected and the rest still apply. Access patterns ' +
          'whose example query does not run are dropped. A dry run reports what it would ' +
          'write and writes nothing.',
      }
    ),
  },
};
