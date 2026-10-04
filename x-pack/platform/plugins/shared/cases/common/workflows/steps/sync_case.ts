/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../bundled-types.gen';
import * as i18n from '../translations';

export const SyncCaseStepTypeId = 'cases.syncCase';

const InputSchema = z
  .object({
    case_id: z.string().min(1).max(1000).optional(),
    external_id: z.string().min(1).max(1000).optional(),
    connector_id: z.string().min(1).max(1000).optional(),
  })
  .refine((input) => input.case_id != null || input.external_id != null, {
    message: 'Either case_id or external_id is required',
  });

const OutputSchema = z.object({
  cases: z.array(CaseResponsePropertiesSchema),
});

type SyncCaseStepInputSchema = typeof InputSchema;
type SyncCaseStepOutputSchema = typeof OutputSchema;

export type SyncCaseStepInput = z.infer<typeof InputSchema>;

export const syncCaseStepCommonDefinition: CommonStepDefinition<
  SyncCaseStepInputSchema,
  SyncCaseStepOutputSchema
> = {
  id: SyncCaseStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SYNC_CASE_STEP_LABEL,
  description: i18n.SYNC_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SYNC_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Sync a case from its external incident
\`\`\`yaml
- name: sync_case
  type: ${SyncCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
\`\`\``,
      `## Sync the case linked to a Jira issue when Jira calls a webhook
\`\`\`yaml
- name: sync_case
  type: ${SyncCaseStepTypeId}
  with:
    external_id: "{{ event.body.issue.id }}"
    connector_id: "my-jira-connector-id"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
