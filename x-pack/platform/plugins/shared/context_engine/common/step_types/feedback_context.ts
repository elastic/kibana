/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema } from './ki';

export const FEEDBACK_CONTEXT_STEP_ID = 'context-engine.getFeedbackContext' as const;

export const feedbackContextInputSchema = z.object({
  ai_index_id: aiIndexIdSchema.describe('The AI index to analyze'),
});

export const feedbackContextOutputSchema = z.object({
  agent_id: z
    .string()
    .describe(
      "The agent to run the analysis with, resolved from the AI index's feedback_analysis.agent_id or the default Elastic agent."
    ),
  briefing: z
    .string()
    .describe('The rendered prompt for the run: the index, its signal patterns, and prior work.'),
  output_schema: z
    .record(z.string(), z.unknown())
    .describe(
      "JSON Schema for the run's structured output, narrowed to the actions this AI index permits."
    ),
  has_signals: z
    .boolean()
    .describe(
      'Whether any selected signal was classified as a problem. False means there is nothing to analyze and the agent should not be run.'
    ),
  signal_window: z
    .object({ from: z.string(), to: z.string() })
    .describe('The resolved window the signals were read from.'),
  signal_spaces: z.array(z.string()).describe('The spaces the selected signals came from.'),
  signal_count: z.number().describe('How many signals were selected.'),
});

export const feedbackContextStepCommonDefinition: CommonStepDefinition<
  typeof feedbackContextInputSchema,
  typeof feedbackContextOutputSchema
> = {
  id: FEEDBACK_CONTEXT_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getFeedbackContext.label', {
    defaultMessage: 'Get feedback analysis context',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.getFeedbackContext.description',
    {
      defaultMessage: 'Assemble everything a Context Engine feedback analysis run reads.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: feedbackContextInputSchema,
  outputSchema: feedbackContextOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getFeedbackContext.documentation.details',
      {
        defaultMessage:
          'Selects the signals relevant to one AI index, folds them into ranked patterns, and ' +
          'renders the briefing an analysis run is given, together with the agent to run it and ' +
          'the output schema it must answer with. Reads signals across every space, because an ' +
          'AI index is global while signals are per-space. Check has_signals before running the ' +
          'agent: a window with no classified patterns has nothing to analyze.',
      }
    ),
    examples: [
      `## Fetch the context for a run
\`\`\`yaml
- name: fetch_context
  type: ${FEEDBACK_CONTEXT_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
\`\`\``,
    ],
  },
};
