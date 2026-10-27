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
import { MEMORY_KI_TYPE_PATTERN } from '../memory';
import { MAX_KI_TYPE_LENGTH, aiIndexIdSchema } from './ki';

export const PURGE_KIS_STEP_ID = 'context-engine.purgeKis' as const;

export const PURGE_KI_STATES = ['deleted', 'expired', 'verification_failed'] as const;
export type PurgeKiState = (typeof PURGE_KI_STATES)[number];

const MAX_PURGE_TYPES = 20;
/** Upper bound on the KIs one run removes, so a mistaken filter cannot empty a large index at once. */
export const MAX_PURGE_KIS = 10_000;

export const purgeKisInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
  types: z
    .array(
      z
        .string()
        .min(1)
        .max(MAX_KI_TYPE_LENGTH)
        // LIKE wildcards are allowed only as one trailing `*`, so a type cannot widen the match.
        .regex(/^[^*?]+\*?$/, 'only a single trailing `*` is allowed')
    )
    .min(1)
    .max(MAX_PURGE_TYPES)
    .default([MEMORY_KI_TYPE_PATTERN])
    .describe(
      'Only KIs of these types are purged. A trailing `*` matches a prefix. Defaults to every memory type (`memory.*`).'
    ),
  states: z
    .array(z.enum(PURGE_KI_STATES))
    .min(1)
    .max(PURGE_KI_STATES.length)
    .default(['deleted', 'expired'])
    .describe('Which KIs to purge: deleted (tombstoned), expired, or verification_failed.'),
  older_than_days: z
    .number()
    .int()
    .min(0)
    .max(3650)
    .default(30)
    .describe('Only KIs whose last write is at least this many days old. Defaults to 30.'),
  dry_run: z
    .boolean()
    .default(false)
    .describe('Report what would be purged without deleting anything.'),
});

export const purgeKisOutputSchema = z.object({
  ids: z.array(z.string()).describe('The ids of the purged (or, in a dry run, purgeable) KIs'),
  deleted: z.number().describe('Documents deleted, every revision included. 0 in a dry run.'),
  truncated: z
    .boolean()
    .describe(`Whether more KIs matched than one run purges (${MAX_PURGE_KIS}).`),
});

export type PurgeKisInput = z.input<typeof purgeKisInputSchema>;

export const purgeKisStepCommonDefinition: CommonStepDefinition<
  typeof purgeKisInputSchema,
  typeof purgeKisOutputSchema
> = {
  id: PURGE_KIS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.purgeKis.label', {
    defaultMessage: 'Purge Knowledge Indicators',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.purgeKis.description', {
    defaultMessage:
      'Permanently delete deleted, expired or failed knowledge indicators (KIs) from an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: purgeKisInputSchema,
  outputSchema: purgeKisOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.purgeKis.documentation.details', {
      defaultMessage:
        'Deleting a KI only tombstones it and expiry only hides it, so both stay on disk. This step removes them for good: it finds the KIs whose current revision is in one of the given states and was last written at least older_than_days ago, then deletes every revision of them. It runs as the workflow owner, who needs write access to the backing index. Defaults to memory KIs only.',
    }),
    examples: [
      `## Purge memories that were deleted or expired more than 30 days ago
\`\`\`yaml
- name: purge
  type: ${PURGE_KIS_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    older_than_days: 30
\`\`\``,
    ],
  },
};
