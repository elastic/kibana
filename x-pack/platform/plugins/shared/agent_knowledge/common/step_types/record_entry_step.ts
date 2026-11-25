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
  ENTRY_ID_PATTERN,
  MAX_ENTRY_ID_LENGTH,
  MAX_ENTRY_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
} from '../constants';
import { pageKeySchema, pageTypeSchema, wikiIdSchema } from './recall_page_step';

export const RecordEntryStepId = 'agentKnowledge.recordEntry' as const;

export const RECORD_ENTRY_OUTCOMES = ['recorded', 'already_recorded'] as const;

export const recordEntryStepInputSchema = lazySchema(() =>
  z.object({
    wiki_id: wikiIdSchema,
    page_type: pageTypeSchema,
    key: pageKeySchema,
    title: z
      .string()
      .min(1)
      .max(MAX_PAGE_TITLE_LENGTH)
      .describe("The page's title, written on every entry so it follows a rename."),
    entry: z.object({
      id: z
        .string()
        .max(MAX_ENTRY_ID_LENGTH)
        .regex(ENTRY_ID_PATTERN)
        .describe('Unique within the page. Recording an id the page already has changes nothing.'),
      content: z
        .string()
        .min(1)
        .max(MAX_ENTRY_LENGTH)
        .describe('Markdown appended under the page type’s entries heading.'),
    }),
    conversation_id: z
      .string()
      .max(128)
      .optional()
      .describe('Conversation the entry came from, stored as provenance.'),
  })
);

export const recordEntryStepOutputSchema = lazySchema(() =>
  z.object({
    outcome: z
      .enum(RECORD_ENTRY_OUTCOMES)
      .describe('`already_recorded` when the page already held an entry with this id.'),
    entry_count: z.number().int().min(0).describe('Entries on the page after the write.'),
  })
);

export const recordEntryStepCommonDefinition: CommonStepDefinition<
  typeof recordEntryStepInputSchema,
  typeof recordEntryStepOutputSchema
> = {
  id: RecordEntryStepId,
  label: i18n.translate('xpack.agentKnowledge.steps.recordEntry.label', {
    defaultMessage: 'Record wiki entry',
  }),
  description: i18n.translate('xpack.agentKnowledge.steps.recordEntry.description', {
    defaultMessage:
      "Adds one entry to a wiki page, creating the page when it does not exist, as the workflow's own identity.",
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: recordEntryStepInputSchema,
  outputSchema: recordEntryStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agentKnowledge.steps.recordEntry.documentation.details', {
      defaultMessage:
        'Entries are only ever added: everything already on the page stays as it was. The write checks the page version it read and retries when another writer changed the page in between. It fails when the page would grow past its size limit, when the workflow identity may not write the wiki index, or when the wiki or page type is unknown.',
    }),
    examples: [
      `- name: record_decision
  type: agentKnowledge.recordEntry
  with:
    wiki_id: my-wiki
    page_type: detection_rule
    key: "{{ inputs.rule_id }}"
    title: "{{ steps.fetch_rule.output.name }}"
    entry:
      id: "{{ steps.read_proposal.output.id }}"
      content: "{{ steps.build_entry.output.content }}"`,
    ],
  },
};
