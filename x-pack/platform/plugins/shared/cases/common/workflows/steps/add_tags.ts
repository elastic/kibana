/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseTags } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const AddTagsStepTypeId = 'cases.addTags';

const InputSchema = CasesStepCaseIdSchema.extend({
  tags: CaseTags,
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type AddTagsStepInputSchema = typeof InputSchema;
type AddTagsStepOutputSchema = typeof OutputSchema;

export type AddTagsStepInput = z.infer<typeof InputSchema>;

export const addTagsStepCommonDefinition: CommonStepDefinition<
  AddTagsStepInputSchema,
  AddTagsStepOutputSchema
> = {
  id: AddTagsStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ADD_TAG_STEP_LABEL,
  description: i18n.ADD_TAG_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_TAG_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case tags
\`\`\`yaml
- name: set_case_tags
  type: ${AddTagsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    tags: ["investigation", "high-priority"]
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
