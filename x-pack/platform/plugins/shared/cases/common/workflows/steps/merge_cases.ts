/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  MAX_CASES_TO_MERGE,
  MAX_CASE_ID_LENGTH,
  MAX_COMMENT_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../constants';
import {
  MergeAttachmentsRequestSchema,
  MergeCasesResponseSchema,
  MergeFieldsRequestSchema,
} from '../../types/api/merge/v1';
import * as i18n from '../translations';

export const MergeCasesStepTypeId = 'cases.mergeCases';

const CaseIdSchema = lazySchema(() => z.string().min(1).max(MAX_CASE_ID_LENGTH));

export const InputSchema = lazySchema(() =>
  z.object({
    case_ids: z
      .array(CaseIdSchema)
      .min(MIN_CASES_TO_MERGE)
      .max(MAX_CASES_TO_MERGE)
      .describe(
        `The ${MIN_CASES_TO_MERGE} to ${MAX_CASES_TO_MERGE} cases to merge, all of one owner and space.`
      ),
    destination_case_id: CaseIdSchema.optional().describe(
      'The case to merge into: one of case_ids that is not closed. When absent, a new case is created.'
    ),
    fields: MergeFieldsRequestSchema.optional().describe(
      'Values for the destination. A field left out takes the default, but every field the cases hold different values for must be given, or the step fails with the list of conflicts.'
    ),
    attachments: MergeAttachmentsRequestSchema.optional().describe(
      'Per kind of attachment: { mode: "newest" } keeps the newest items up to the limit. Without it, a kind over its limit fails the step.'
    ),
    close_sources: z
      .boolean()
      .optional()
      .default(true)
      .describe('Close the source cases that are open or in progress. Defaults to true.'),
    note: z
      .string()
      .min(1)
      .max(MAX_COMMENT_LENGTH)
      .optional()
      .describe('Posted as a comment on the destination.'),
  })
);

export const OutputSchema = lazySchema(() =>
  MergeCasesResponseSchema.extend({
    /** The source cases the merge closed. */
    closedCaseIds: z.array(z.string()),
  })
);

export type MergeCasesStepInput = z.infer<typeof InputSchema>;
export type MergeCasesStepOutput = z.infer<typeof OutputSchema>;

type MergeCasesStepInputSchema = typeof InputSchema;
type MergeCasesStepOutputSchema = typeof OutputSchema;

export const mergeCasesStepCommonDefinition: CommonStepDefinition<
  MergeCasesStepInputSchema,
  MergeCasesStepOutputSchema
> = {
  id: MergeCasesStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.MERGE_CASES_STEP_LABEL,
  description: i18n.MERGE_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.MERGE_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Merge cases into a new case
\`\`\`yaml
- name: merge_cases
  type: ${MergeCasesStepTypeId}
  with:
    case_ids: ["case-1", "case-2", "case-3"]
    fields:
      title: "Phishing campaign against finance"
      description: "Merged from the three phishing reports."
      severity: "high"
    attachments:
      alerts:
        mode: "newest"
\`\`\``,
      `## Merge into an existing case and keep the sources open
\`\`\`yaml
- name: merge_into_existing
  type: ${MergeCasesStepTypeId}
  with:
    case_ids: ["case-1", "case-2"]
    destination_case_id: "case-1"
    close_sources: false
    note: "Merged by the duplicate-detection workflow."
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
