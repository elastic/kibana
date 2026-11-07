/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import { CasesStepCaseIdSchema } from './shared';
import { CASES_OUTCOMES_AI_INDEX_ID } from '../../constants';

export const GetCaseOutcomeStepTypeId = 'cases.getCaseOutcome';

const InputSchema = CasesStepCaseIdSchema;

const OutputSchema = z.object({
  publish: z.boolean(),
  retract: z.boolean(),
  ki_id: z.string(),
  skip_reason: z
    .enum(['owner_not_published', 'restricted', 'not_closed', 'publishing_off', 'context_engine_off'])
    .optional(),
  ki: z
    .object({
      type: z.string(),
      title: z.string(),
      description: z.string(),
      content: z.string(),
      tags: z.array(z.string()),
      attributes: z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
      ),
      references: z.array(
        z.object({
          uri: z.string(),
          relation: z.enum(['derived_from', 'relates_to']),
          description: z.string().optional(),
        })
      ),
    })
    .optional(),
});

export type GetCaseOutcomeStepInput = z.infer<typeof InputSchema>;

export const getCaseOutcomeStepCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: GetCaseOutcomeStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.GET_CASE_OUTCOME_STEP_LABEL,
  description: i18n.GET_CASE_OUTCOME_STEP_DESCRIPTION,
  documentation: {
    details: i18n.GET_CASE_OUTCOME_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Publish a closed case's outcome
\`\`\`yaml
- name: outcome
  type: ${GetCaseOutcomeStepTypeId}
  with:
    case_id: "{{ event.caseId }}"
- name: publish
  type: context-engine.createKi
  if: "\${{ steps.outcome.output.publish == true }}"
  with:
    ai_index_id: ${CASES_OUTCOMES_AI_INDEX_ID}
    ki_id: "{{ steps.outcome.output.ki_id }}"
    ki: "\${{ steps.outcome.output.ki }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
