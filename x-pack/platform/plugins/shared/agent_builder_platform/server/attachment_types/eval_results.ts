/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

const EVAL_RESULTS_TYPE = 'eval-results' as const;

const evalResultsDataSchema = z.object({
  summary: z.object({
    meanScore: z.number(),
    passRate: z.number(),
    examplesRan: z.number(),
  }),
  evaluatorScores: z.array(
    z.object({
      name: z.string(),
      meanScore: z.number(),
      passCount: z.number(),
      failCount: z.number(),
    })
  ),
});

export type EvalResultsAttachmentData = z.infer<typeof evalResultsDataSchema>;

/**
 * Attachment type for passing skill evaluation results to the AI Assistant
 * so it can suggest improvements based on eval scores.
 */
export const createEvalResultsAttachmentType = (): AttachmentTypeDefinition<
  typeof EVAL_RESULTS_TYPE,
  EvalResultsAttachmentData
> => ({
  id: EVAL_RESULTS_TYPE,
  validate: (input) => {
    const result = evalResultsDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { summary, evaluatorScores } = attachment.data;
      const lines = [
        '## Evaluation Results',
        '',
        `**Overall Score:** ${(summary.meanScore * 100).toFixed(0)}%`,
        `**Pass Rate:** ${(summary.passRate * 100).toFixed(0)}%`,
        `**Examples Evaluated:** ${summary.examplesRan}`,
        '',
        '### Evaluator Breakdown',
        ...evaluatorScores.map(
          (e) =>
            `- **${e.name}**: ${(e.meanScore * 100).toFixed(0)}% (${e.passCount} passed, ${
              e.failCount
            } failed)`
        ),
      ];
      return { type: 'text', value: lines.join('\n') };
    },
  }),
  getAgentDescription: () =>
    'An eval-results attachment provides evaluation scores for an Agent Builder skill. ' +
    'It includes overall mean score, pass rate, and per-evaluator breakdowns. ' +
    'Use it to identify which evaluators scored low and suggest targeted improvements.',
  getTools: () => [],
});
