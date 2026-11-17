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
import { aiIndexIdSchema, kiIdSchema, MAX_KI_DESCRIPTION_LENGTH, MAX_KI_TITLE_LENGTH } from './ki';
import { evidenceIdSchema, evidenceListSchema, MAX_EVIDENCE_ITEMS } from './research';
import { plannedWriteSchema } from './apply_dream_changes';

export const SELECT_ENRICHMENT_CANDIDATES_STEP_ID =
  'context-engine.selectEnrichmentCandidates' as const;
export const APPLY_ENRICHMENT_STEP_ID = 'context-engine.applyEnrichment' as const;

export const MAX_ENRICHMENT_CANDIDATES = 200;
export const DEFAULT_ENRICHMENT_CANDIDATES = 100;
const MAX_TIMESTAMP_LENGTH = 64;

export const selectEnrichmentCandidatesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_ENRICHMENT_CANDIDATES)
      .optional()
      .describe(
        `At most how many candidates to return. Defaults to ${DEFAULT_ENRICHMENT_CANDIDATES}.`
      ),
  })
);

export const selectEnrichmentCandidatesOutputSchema = lazySchema(() =>
  z.object({
    candidates: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          title: z.string(),
          description: z.string().optional(),
          summary: z.string().optional().describe('The start of its content'),
          updated_at: z.string().optional(),
          enriched_at: z.string().optional(),
          occurrences: z.number().optional(),
          reason: z
            .enum(['never_enriched', 'changed', 'stale'])
            .describe('Why it is due: never enriched, changed since, or enriched long ago'),
        })
      )
      .describe('The KIs due for enrichment, best first'),
    scanned: z.number().describe('How many KIs of the configured types were looked at'),
  })
);

export type SelectEnrichmentCandidatesOutput = z.infer<
  typeof selectEnrichmentCandidatesOutputSchema
>;

export const selectEnrichmentCandidatesStepCommonDefinition: CommonStepDefinition<
  typeof selectEnrichmentCandidatesInputSchema,
  typeof selectEnrichmentCandidatesOutputSchema
> = {
  id: SELECT_ENRICHMENT_CANDIDATES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.selectEnrichmentCandidates.label', {
    defaultMessage: 'Select enrichment candidates',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.selectEnrichmentCandidates.description',
    {
      defaultMessage: 'List the knowledge items of an AI index that are due for enrichment.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: selectEnrichmentCandidatesInputSchema,
  outputSchema: selectEnrichmentCandidatesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.selectEnrichmentCandidates.documentation.details',
      {
        defaultMessage:
          'Reads the KI types of the enrichment config of the AI index and returns the active KIs ' +
          'visible in this space that are due: never enriched first, then changed since they ' +
          'were enriched, then enriched longer ago than refresh_after. Within each, the KIs ' +
          'seen in the most memories come first.',
      }
    ),
  },
};

/** What the enriching model returns for one knowledge item. */
export const enrichmentChangeSchema = lazySchema(() =>
  z.object({
    changed: z.boolean().describe('Whether the evidence adds anything to the knowledge item'),
    title: z.string().max(MAX_KI_TITLE_LENGTH).optional(),
    description: z.string().max(MAX_KI_DESCRIPTION_LENGTH).optional(),
    content: z.string().max(MAX_KI_CONTENT_LENGTH).optional(),
    citations: z.array(evidenceIdSchema).max(MAX_EVIDENCE_ITEMS).optional(),
  })
);

export const applyEnrichmentInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    ki_id: kiIdSchema,
    expected_updated_at: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .optional()
      .describe('The updated_at of the KI as it was read; it is left alone when it changed since'),
    changes: enrichmentChangeSchema.describe('What the enriching model returned'),
    evidence: evidenceListSchema.describe('The evidence the model was shown'),
    dry_run: z.boolean().optional().describe('Report what would be written, without writing'),
  })
);

export const applyEnrichmentOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['created', 'updated', 'skipped']),
    improved: z.boolean().describe('Whether its content changed'),
    reason: z.string().optional().describe('Why it was skipped'),
    cited: z.array(z.string()).describe('The evidence the improvement cites'),
    dropped_citations: z.array(z.string()).describe('Citations of evidence it was not shown'),
    tally: z
      .object({ improved: z.number(), unchanged: z.number(), skipped: z.number() })
      .describe('1 for what happened to the KI and 0 for the rest, to add up across a run'),
    would_write: z
      .array(plannedWriteSchema)
      .describe('On a dry run, the KI it would write; empty otherwise'),
    document: z
      .object({ id: z.string(), type: z.string(), title: z.string() })
      .passthrough()
      .optional()
      .describe('The KI as stored; on a dry run, as it would be'),
  })
);

export type ApplyEnrichmentOutput = z.infer<typeof applyEnrichmentOutputSchema>;

export const applyEnrichmentStepCommonDefinition: CommonStepDefinition<
  typeof applyEnrichmentInputSchema,
  typeof applyEnrichmentOutputSchema
> = {
  id: APPLY_ENRICHMENT_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyEnrichment.label', {
    defaultMessage: 'Apply enrichment',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.applyEnrichment.description', {
    defaultMessage: 'Write what enrichment found for a knowledge item of an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyEnrichmentInputSchema,
  outputSchema: applyEnrichmentOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyEnrichment.documentation.details',
      {
        defaultMessage:
          'Replaces the content of the KI with the improved content, keeping its access ' +
          'patterns and permissions, and adds the evidence it cites as derived_from ' +
          'references. An improvement that cites none of the evidence the model was shown is ' +
          'not applied. Either way the KI records when it was enriched, under ' +
          'attributes["memory.enriched_at"]. A KI that changed since it was read is left for ' +
          'the next run.',
      }
    ),
  },
};
