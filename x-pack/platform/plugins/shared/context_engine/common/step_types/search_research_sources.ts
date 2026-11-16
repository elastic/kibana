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
import { aiIndexIdSchema } from './ki';
import {
  DEFAULT_RESEARCH_RESULTS_PER_SEARCH,
  MAX_EVIDENCE_ITEMS,
  MAX_RESEARCH_RESULTS_PER_SEARCH,
  MAX_RESEARCH_SEARCHES,
  evidenceIdSchema,
  evidenceListSchema,
  researchErrorSchema,
  researchSearchSchema,
} from './research';

export const SEARCH_RESEARCH_SOURCES_STEP_ID = 'context-engine.searchResearchSources' as const;

export const searchResearchSourcesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    searches: z
      .array(researchSearchSchema)
      .max(MAX_RESEARCH_SEARCHES)
      .describe('The searches to run, each naming a source by its ref'),
    results_per_search: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESEARCH_RESULTS_PER_SEARCH)
      .optional()
      .describe(
        `At most how many results each search returns. Defaults to ${DEFAULT_RESEARCH_RESULTS_PER_SEARCH}.`
      ),
    skip_evidence_ids: z
      .array(evidenceIdSchema)
      .max(MAX_EVIDENCE_ITEMS)
      .optional()
      .describe('Evidence already found, left out of the output'),
  })
);

export const searchResearchSourcesOutputSchema = lazySchema(() =>
  z.object({
    evidence: evidenceListSchema.describe('What the searches found, each with an id to cite'),
    errors: z
      .array(researchErrorSchema)
      .describe('The searches that failed, each with why, so the model can correct them'),
  })
);

export type SearchResearchSourcesOutput = z.infer<typeof searchResearchSourcesOutputSchema>;

export const searchResearchSourcesStepCommonDefinition: CommonStepDefinition<
  typeof searchResearchSourcesInputSchema,
  typeof searchResearchSourcesOutputSchema
> = {
  id: SEARCH_RESEARCH_SOURCES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.searchResearchSources.label', {
    defaultMessage: 'Search research sources',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.searchResearchSources.description',
    {
      defaultMessage: 'Search the sources of an AI index for information to add to it.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: searchResearchSourcesInputSchema,
  outputSchema: searchResearchSourcesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.searchResearchSources.documentation.details',
      {
        defaultMessage:
          'Runs each search against a source of the AI index, as the workflow user: an ES|QL ' +
          'source is searched full-text across the indices its FROM reads, and a connector ' +
          'source runs one of its read-only sub-actions. Only sources of the AI index, and ' +
          'sub-actions that read, can run. Each result becomes a piece of evidence with a ' +
          'stable id, its origin as a URI, and its text shortened. A failed search is reported ' +
          'in errors and does not stop the others.',
      }
    ),
  },
};
