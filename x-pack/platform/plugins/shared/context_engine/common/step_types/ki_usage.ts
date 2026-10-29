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
import { kiIdSchema } from './ki';

export const GET_KI_USAGE_STEP_ID = 'context-engine.getKiUsage' as const;
export const RECORD_KI_ENRICHMENT_STEP_ID = 'context-engine.recordKiEnrichment' as const;

const MAX_KI_IDS = 1000;
const MAX_USAGE_LIMIT = 100;

const kiIdsSchema = z.array(kiIdSchema).max(MAX_KI_IDS);

export const getKiUsageInputSchema = z.object({
  ki_ids: kiIdsSchema.describe('The KIs to read the usage of.'),
  min_new_accesses: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .optional()
    .describe(
      'Only KIs agents read at least this many times since their last enrichment (or ever, when never enriched).'
    ),
  min_days_since_enrichment: z
    .number()
    .int()
    .min(0)
    .max(3650)
    .optional()
    .describe('Only KIs never enriched or last enriched at least this many days ago.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_USAGE_LIMIT)
    .optional()
    .describe(
      `Maximum KIs to return, most read since enrichment first. Defaults to ${MAX_USAGE_LIMIT}.`
    ),
});

export const getKiUsageOutputSchema = z.object({
  kis: z
    .array(
      z.object({
        ki_id: z.string(),
        access_count: z.number().describe('Times agents read the KI.'),
        new_accesses: z.number().describe('Reads since the last enrichment.'),
        last_accessed_at: z.string(),
        last_enriched_at: z.string().optional(),
      })
    )
    .describe('The KIs that meet the thresholds. A KI no agent ever read is not listed.'),
});

export const recordKiEnrichmentInputSchema = z.object({
  ki_ids: kiIdsSchema.describe('The KIs just enriched.'),
});

export const recordKiEnrichmentOutputSchema = z.object({
  recorded: z.number().describe('How many KIs were marked enriched.'),
});

export type GetKiUsageInput = z.infer<typeof getKiUsageInputSchema>;
export type RecordKiEnrichmentInput = z.infer<typeof recordKiEnrichmentInputSchema>;

export const getKiUsageStepCommonDefinition: CommonStepDefinition<
  typeof getKiUsageInputSchema,
  typeof getKiUsageOutputSchema
> = {
  id: GET_KI_USAGE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getKiUsage.label', {
    defaultMessage: 'Get KI usage',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.getKiUsage.description', {
    defaultMessage: 'How often agents read KIs, to act only on the ones that matter.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getKiUsageInputSchema,
  outputSchema: getKiUsageOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getKiUsage.documentation.details',
      {
        defaultMessage:
          'A read is counted each time an agent gets the KI back from the AI index query tool, in the workflow space. Reads by workflows, the API and the UI are not counted. With the thresholds, only KIs due for enrichment are returned; pair it with context-engine.recordKiEnrichment so a KI is not enriched again until it is read again.',
      }
    ),
    examples: [
      `## KIs read 3 times since they were last enriched
\`\`\`yaml
- name: usage
  type: ${GET_KI_USAGE_STEP_ID}
  with:
    ki_ids: "\${{ steps.candidates.output.rows | map: 'id' }}"
    min_new_accesses: 3
    min_days_since_enrichment: 7
    limit: 10
\`\`\``,
    ],
  },
};

export const recordKiEnrichmentStepCommonDefinition: CommonStepDefinition<
  typeof recordKiEnrichmentInputSchema,
  typeof recordKiEnrichmentOutputSchema
> = {
  id: RECORD_KI_ENRICHMENT_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.recordKiEnrichment.label', {
    defaultMessage: 'Record KI enrichment',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.recordKiEnrichment.description',
    {
      defaultMessage: 'Marks KIs enriched now, so their reads count again from zero.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: recordKiEnrichmentInputSchema,
  outputSchema: recordKiEnrichmentOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.recordKiEnrichment.documentation.details',
      {
        defaultMessage:
          'Record each KI once its enrichment ran, whether or not anything was added, so it waits for new reads before it is tried again.',
      }
    ),
    examples: [
      `## Mark a memory enriched
\`\`\`yaml
- name: mark_enriched
  type: ${RECORD_KI_ENRICHMENT_STEP_ID}
  with:
    ki_ids:
      - "{{ foreach.item.ki_id }}"
\`\`\``,
    ],
  },
};
