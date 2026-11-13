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
import { AGENT_KNOWLEDGE_RECALL_STEP_ID } from '../constants';

export const RecallWikiStepId = AGENT_KNOWLEDGE_RECALL_STEP_ID;

export const recallWikiStepInputSchema = z.object({
  ai_index_id: z
    .string()
    .min(1)
    .max(256)
    .describe('Context Engine AI index registry id that holds the wiki pages.'),
  query: z
    .string()
    .max(4000)
    .optional()
    .describe('Optional free-text query used to rank or filter recalled pages.'),
  entity_types: z
    .array(z.string().min(1).max(64))
    .max(20)
    .optional()
    .describe('When set, only pages of these wiki entity types are returned.'),
  slugs: z
    .array(z.string().min(1).max(128))
    .max(50)
    .optional()
    .describe('When set, only pages whose slug is in this list are returned.'),
  status: z
    .enum(['established', 'tentative', 'archived'])
    .optional()
    .describe('When set, only pages with this lifecycle status are returned.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe('Maximum number of wiki pages to return.'),
});

export const recallWikiStepOutputSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      entity_type: z.string(),
      status: z.string(),
      slug: z.string(),
      content: z.string(),
      description: z.string().optional(),
      corroborations: z.number(),
    })
  ),
  recalled_ids: z.array(z.string()),
  context_markdown: z
    .string()
    .describe('Bounded markdown block ready to inject into an agent message.'),
});

export const recallWikiStepCommonDefinition: BaseStepDefinition<
  typeof recallWikiStepInputSchema,
  typeof recallWikiStepOutputSchema
> = {
  id: RecallWikiStepId,
  label: i18n.translate('xpack.agentKnowledge.steps.recall.label', {
    defaultMessage: 'Recall wiki pages',
  }),
  description: i18n.translate('xpack.agentKnowledge.steps.recall.description', {
    defaultMessage:
      'Recalls wiki pages from a managed AI index for injection into a worker or agent message.',
  }),
  category: StepCategory.Ai,
  stability: 'tech_preview',
  inputSchema: recallWikiStepInputSchema,
  outputSchema: recallWikiStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agentKnowledge.steps.recall.documentation.details', {
      defaultMessage:
        'Returns matching wiki pages and a markdown block. Use recalled_ids later when recording feedback after a gate or round.',
    }),
    examples: [
      `- name: recall_rule_wiki
  type: agentKnowledge.recall
  with:
    ai_index_id: alertzero-wiki
    entity_types: ["detection_rule", "data_source"]
    slugs: ["suspicious-powershell-download"]
    limit: 10`,
    ],
  },
};
