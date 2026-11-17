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

export const LIST_RESEARCH_SOURCES_STEP_ID = 'context-engine.listResearchSources' as const;

export const listResearchSourcesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
  })
);

export const researchSourceSchema = lazySchema(() =>
  z.object({
    ref: z.string().describe('The ref a search names the source by'),
    type: z.enum(['esql', 'connector']),
    name: z.string().describe('The ES|QL query, or the connector name'),
    description: z.string(),
    indices: z.array(z.string()).optional().describe('For an ES|QL source: the indices it reads'),
    connector_id: z.string().optional().describe('For a connector source: its id'),
    sub_actions: z
      .array(z.object({ name: z.string(), description: z.string(), params: z.string() }))
      .optional()
      .describe('For a connector source: the sub-actions research may run, all of which only read'),
    guidance: z.string().optional().describe('For a connector source: how to use its sub-actions'),
    error: z.string().optional().describe('Why the source cannot be searched'),
  })
);

export const listResearchSourcesOutputSchema = lazySchema(() =>
  z.object({
    sources: z
      .array(researchSourceSchema)
      .describe('The sources research can search; ones that cannot be searched say why'),
    usable: z.number().describe('How many of the sources can be searched'),
  })
);

export type ListResearchSourcesOutput = z.infer<typeof listResearchSourcesOutputSchema>;

export const listResearchSourcesStepCommonDefinition: CommonStepDefinition<
  typeof listResearchSourcesInputSchema,
  typeof listResearchSourcesOutputSchema
> = {
  id: LIST_RESEARCH_SOURCES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.listResearchSources.label', {
    defaultMessage: 'List research sources',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.listResearchSources.description',
    {
      defaultMessage: 'List what dreaming can search to add information to an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: listResearchSourcesInputSchema,
  outputSchema: listResearchSourcesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.listResearchSources.documentation.details',
      {
        defaultMessage:
          'Describes each source of the AI index for the research agent: an ES|QL source by the ' +
          'indices its FROM reads, and a connector source by its sub-actions and their ' +
          'parameters. Research only uses read-only connectors: those whose enabled agent ' +
          'sub-actions all only read. A connector that can write, like any source that cannot ' +
          'be searched, says why.',
      }
    ),
  },
};
