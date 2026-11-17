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
  aiIndexIdSchema,
  kiIdSchema,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TITLE_LENGTH,
} from './ki';
import {
  evidenceIdSchema,
  evidenceListSchema,
  MAX_EVIDENCE_ITEMS,
  MAX_RESEARCH_QUERY_LENGTH,
} from './research';
import { plannedWriteSchema } from './apply_dream_changes';

export const GATHER_WIKI_PAGE_STEP_ID = 'context-engine.gatherWikiPage' as const;
export const APPLY_WIKI_PAGE_STEP_ID = 'context-engine.applyWikiPage' as const;

/** At most how many members a wiki page has, and the default the gather step reads. */
export const MAX_WIKI_PAGE_MEMBERS = 60;
export const DEFAULT_WIKI_PAGE_MEMBERS = 40;
const MAX_SEED_IDS = 100;

const pageRefSchema = lazySchema(() =>
  z
    .string()
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe('The id of an existing wiki page, or a new key like "new:1" for a new one')
);

export const gatherWikiPageInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    page_ref: pageRefSchema,
    seed_ids: z
      .array(kiIdSchema)
      .max(MAX_SEED_IDS)
      .describe('The knowledge items the page was planned from'),
    member_query: z
      .string()
      .max(MAX_RESEARCH_QUERY_LENGTH)
      .optional()
      .describe('What the page is about, to find other knowledge items it should tie together'),
    max_members: z
      .number()
      .int()
      .min(1)
      .max(MAX_WIKI_PAGE_MEMBERS)
      .optional()
      .describe(`At most how many members to gather. Defaults to ${DEFAULT_WIKI_PAGE_MEMBERS}.`),
  })
);

const memberSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    occurrences: z.number().optional(),
  })
);

export const gatherWikiPageOutputSchema = lazySchema(() =>
  z.object({
    page: z
      .object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        content: z.string().optional(),
        member_ids: z.array(z.string()),
      })
      .optional()
      .describe('The page as it is, when it exists'),
    members: z.array(memberSchema).describe('The knowledge items the page ties together'),
    dropped: z
      .number()
      .describe('Candidate members left out: no longer active, seen by others, or over the cap'),
  })
);

export type GatherWikiPageOutput = z.infer<typeof gatherWikiPageOutputSchema>;

export const gatherWikiPageStepCommonDefinition: CommonStepDefinition<
  typeof gatherWikiPageInputSchema,
  typeof gatherWikiPageOutputSchema
> = {
  id: GATHER_WIKI_PAGE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.gatherWikiPage.label', {
    defaultMessage: 'Gather wiki page',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.gatherWikiPage.description', {
    defaultMessage: 'Gather the knowledge items a wiki page of an AI index ties together.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: gatherWikiPageInputSchema,
  outputSchema: gatherWikiPageOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.gatherWikiPage.documentation.details',
      {
        defaultMessage:
          'Returns the page as it is and its members: the seed items, the current members of the ' +
          'page, and the knowledge items most related to member_query, found by semantic and ' +
          'keyword search. Members are of the KI types of the wiki config, active, and seen by ' +
          'the same people as the page.',
      }
    ),
  },
};

/** What the writing model returns for a wiki page. */
export const wikiPageChangeSchema = lazySchema(() =>
  z.object({
    title: z.string().max(MAX_KI_TITLE_LENGTH),
    description: z.string().max(MAX_KI_DESCRIPTION_LENGTH).optional(),
    content: z.string().max(MAX_KI_CONTENT_LENGTH),
    member_ids: z.array(kiIdSchema).max(MAX_WIKI_PAGE_MEMBERS),
    citations: z.array(evidenceIdSchema).max(MAX_EVIDENCE_ITEMS).optional(),
  })
);

export const applyWikiPageInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    page_ref: pageRefSchema,
    page: wikiPageChangeSchema.describe('The page the writing model returned'),
    evidence: evidenceListSchema.describe('The evidence the model was shown'),
    dry_run: z.boolean().optional().describe('Report what would be written, without writing'),
  })
);

export const applyWikiPageOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['created', 'updated', 'skipped']),
    id: z.string().optional().describe('The id of the page'),
    reason: z.string().optional().describe('Why it was skipped'),
    members: z.number().describe('How many knowledge items it ties together'),
    cited: z.array(z.string()).describe('The evidence it cites'),
    dropped_citations: z.array(z.string()).describe('Citations of evidence it was not shown'),
    tally: z
      .object({ created: z.number(), updated: z.number(), skipped: z.number() })
      .describe('1 for what happened to the page and 0 for the rest, to add up across a run'),
    would_write: z
      .array(plannedWriteSchema)
      .describe('On a dry run, the page it would write; empty otherwise'),
    document: z
      .object({ id: z.string(), type: z.string(), title: z.string() })
      .passthrough()
      .optional()
      .describe('The page as stored; on a dry run, as it would be'),
  })
);

export type ApplyWikiPageOutput = z.infer<typeof applyWikiPageOutputSchema>;

export const applyWikiPageStepCommonDefinition: CommonStepDefinition<
  typeof applyWikiPageInputSchema,
  typeof applyWikiPageOutputSchema
> = {
  id: APPLY_WIKI_PAGE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyWikiPage.label', {
    defaultMessage: 'Apply wiki page',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.applyWikiPage.description', {
    defaultMessage: 'Write a wiki page into an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyWikiPageInputSchema,
  outputSchema: applyWikiPageOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyWikiPage.documentation.details',
      {
        defaultMessage:
          'Creates or updates a wiki.page KI. Its members must be active knowledge items seen by ' +
          'the same people; the page is visible to exactly them, records each member as a ' +
          'relates_to reference, and cites the evidence it is based on as derived_from ' +
          'references. A page left with no members is not written.',
      }
    ),
  },
};
