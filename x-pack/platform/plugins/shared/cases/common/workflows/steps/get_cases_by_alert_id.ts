/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { Owner, Owners, RelatedCase } from '../../bundled-types.gen';
import * as i18n from '../translations';
import { MAX_DOCS_PER_PAGE } from '../../constants';

export const GetCasesByAlertIdStepTypeId = 'cases.getCasesByAlertId';

const InputSchema = z.object({
  alert_id: z.string().min(1, 'alert_id is required'),
  owner: z.union([Owner, Owners]).optional(),
});

const OutputSchema = z.object({
  cases: z.array(RelatedCase).max(MAX_DOCS_PER_PAGE),
});

type GetCasesByAlertIdStepInputSchema = typeof InputSchema;
type GetCasesByAlertIdStepOutputSchema = typeof OutputSchema;

export type GetCasesByAlertIdStepInput = z.infer<typeof InputSchema>;

export const getCasesByAlertIdStepCommonDefinition: CommonStepDefinition<
  GetCasesByAlertIdStepInputSchema,
  GetCasesByAlertIdStepOutputSchema
> = {
  id: GetCasesByAlertIdStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.GET_CASES_BY_ALERT_ID_STEP_LABEL,
  description: i18n.GET_CASES_BY_ALERT_ID_STEP_DESCRIPTION,
  documentation: {
    details: i18n.GET_CASES_BY_ALERT_ID_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Check if alert already belongs to a case
\`\`\`yaml
- name: get_cases_for_alert
  type: ${GetCasesByAlertIdStepTypeId}
  with:
    alert_id: "550e8400-e29b-41d4-a716-446655440000"
\`\`\``,
      `## Filter by owner
\`\`\`yaml
- name: get_security_cases_for_alert
  type: ${GetCasesByAlertIdStepTypeId}
  with:
    alert_id: "550e8400-e29b-41d4-a716-446655440000"
    owner: "securitySolution"
\`\`\``,
      `## Route alert to existing case or create a new one
\`\`\`yaml
- name: check_existing_cases
  type: ${GetCasesByAlertIdStepTypeId}
  with:
    alert_id: \${{ trigger.alert.id }}
    owner: "securitySolution"

- name: create_case_if_none
  type: cases.createCase
  if: \${{ steps.check_existing_cases.output.cases.length === 0 }}
  with:
    title: "New incident"
    owner: "securitySolution"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
