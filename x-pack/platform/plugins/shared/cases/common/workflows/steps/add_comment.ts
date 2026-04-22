/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import { MAX_COMMENT_LENGTH } from '../../constants';
import * as i18n from '../translations';

export const AddCommentStepTypeId = 'cases.addComment';

export const InputSchema = CasesStepCaseIdSchema.extend({
  comment: z.string().min(1, 'comment is required').max(MAX_COMMENT_LENGTH),
});

export const OutputSchema = CasesStepSingleCaseOutputSchema;

type AddCommentStepInputSchema = typeof InputSchema;
type AddCommentStepOutputSchema = typeof OutputSchema;

export type AddCommentStepInput = z.infer<typeof InputSchema>;

export const addCommentStepCommonDefinition: CommonStepDefinition<
  AddCommentStepInputSchema,
  AddCommentStepOutputSchema
> = {
  id: AddCommentStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.ADD_COMMENT_STEP_LABEL,
  description: i18n.ADD_COMMENT_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_COMMENT_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add comment to a case
\`\`\`yaml
- name: add_case_comment
  type: ${AddCommentStepTypeId}
  with:
    case_id: "abc-123-def-456"
    comment: "Investigating this incident now."
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
