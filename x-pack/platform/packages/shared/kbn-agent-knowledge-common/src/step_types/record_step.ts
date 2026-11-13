/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { AGENT_KNOWLEDGE_RECORD_STEP_ID } from '../constants';
import { WIKI_EDIT_ACTIONS, WIKI_PAGE_STATUSES } from '../wiki/types';

export const RecordWikiStepId = AGENT_KNOWLEDGE_RECORD_STEP_ID;

const wikiEditSchema = z.object({
  action: z.enum(WIKI_EDIT_ACTIONS),
  entity_type: z.string().min(1).max(64),
  slug: z.string().min(1).max(128),
  title: z.string().min(1).max(512),
  description: z.string().max(2000).optional(),
  content: z.string().max(100_000).optional(),
  status: z.enum(WIKI_PAGE_STATUSES).optional(),
});

export const recordWikiStepInputSchema = z.object({
  ai_index_id: z
    .string()
    .min(1)
    .max(256)
    .describe('Context Engine AI index registry id that holds the wiki pages.'),
  edits: z
    .array(wikiEditSchema)
    .max(20)
    .describe('Wiki edits already proposed by the product optimizer.'),
  conversation_id: z.string().max(512).optional(),
  round_id: z.string().max(512).optional(),
  workflow_execution_id: z.string().max(512).optional(),
});

export const recordWikiStepOutputSchema = z.object({
  applied: z.array(
    z.object({
      action: z.string(),
      id: z.string(),
      entity_type: z.string(),
      slug: z.string(),
    })
  ),
  skipped: z.array(
    z.object({
      action: z.string(),
      entity_type: z.string(),
      slug: z.string(),
      reason: z.string(),
    })
  ),
});

export const recordWikiStepCommonDefinition: BaseStepDefinition<
  typeof recordWikiStepInputSchema,
  typeof recordWikiStepOutputSchema
> = {
  id: RecordWikiStepId,
  label: i18n.translate('xpack.agentKnowledge.steps.record.label', {
    defaultMessage: 'Record wiki edits',
  }),
  description: i18n.translate('xpack.agentKnowledge.steps.record.description', {
    defaultMessage:
      'Applies product-proposed wiki upsert, corroborate, and archive edits to a managed AI index.',
  }),
  category: StepCategory.Ai,
  stability: 'tech_preview',
  inputSchema: recordWikiStepInputSchema,
  outputSchema: recordWikiStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agentKnowledge.steps.record.documentation.details', {
      defaultMessage:
        'Validates edits against the product type pack, lints content, and persists them. The step does not call an LLM; the product optimizer must propose edits first.',
    }),
    examples: [
      `- name: record_wiki
  type: agentKnowledge.record
  with:
    ai_index_id: alertzero-wiki
    conversation_id: "{{ steps.create_investigation.output.conversation_id }}"
    edits: "\${{ steps.optimize_wiki.output.edits }}"`,
    ],
  },
};
