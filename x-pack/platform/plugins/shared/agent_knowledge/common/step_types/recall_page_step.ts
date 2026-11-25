/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_PAGE_CONTENT_LENGTH,
  MAX_PAGE_KEY_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
  PAGE_KEY_PATTERN,
  PAGE_TYPE_PATTERN,
  WIKI_ID_PATTERN,
} from '../constants';

export const RecallPageStepId = 'agentKnowledge.recallPage' as const;

export const wikiIdSchema = lazySchema(() =>
  z.string().max(64).regex(WIKI_ID_PATTERN).describe('Id of a wiki a plugin registered.')
);

export const pageTypeSchema = lazySchema(() =>
  z.string().max(64).regex(PAGE_TYPE_PATTERN).describe('A page type the wiki registered.')
);

export const pageKeySchema = lazySchema(() =>
  z
    .string()
    .max(MAX_PAGE_KEY_LENGTH)
    .regex(PAGE_KEY_PATTERN)
    .describe('Stable id of what the page is about, such as a saved-object id.')
);

export const recallPageStepInputSchema = lazySchema(() =>
  z.object({
    wiki_id: wikiIdSchema,
    page_type: pageTypeSchema,
    key: pageKeySchema,
  })
);

export const recalledPageSchema = lazySchema(() =>
  z.object({
    key: z.string().max(MAX_PAGE_KEY_LENGTH),
    title: z.string().max(MAX_PAGE_TITLE_LENGTH),
    content: z.string().max(MAX_PAGE_CONTENT_LENGTH),
    entry_count: z.number().int().min(0),
    updated_at: z.string().max(64),
  })
);

export type RecalledPage = z.infer<typeof recalledPageSchema>;

export const recallPageStepOutputSchema = lazySchema(() =>
  z.object({
    found: z.boolean().describe('Whether the page exists in this space.'),
    page: recalledPageSchema.optional().describe('The page, when found.'),
  })
);

export const recallPageStepCommonDefinition: CommonStepDefinition<
  typeof recallPageStepInputSchema,
  typeof recallPageStepOutputSchema
> = {
  id: RecallPageStepId,
  label: i18n.translate('xpack.agentKnowledge.steps.recallPage.label', {
    defaultMessage: 'Recall wiki page',
  }),
  description: i18n.translate('xpack.agentKnowledge.steps.recallPage.description', {
    defaultMessage:
      "Reads one wiki page by its type and key, in the workflow's space, as the workflow's own identity.",
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: recallPageStepInputSchema,
  outputSchema: recallPageStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agentKnowledge.steps.recallPage.documentation.details', {
      defaultMessage:
        'An exact read, not a search: it returns the page stored under this key or found: false. A page that does not exist is not an error. A read the workflow identity is not allowed to make, or an unknown wiki or page type, fails the step.',
    }),
    examples: [
      `- name: recall_page
  type: agentKnowledge.recallPage
  with:
    wiki_id: my-wiki
    page_type: detection_rule
    key: "{{ inputs.rule_id }}"`,
    ],
  },
};
