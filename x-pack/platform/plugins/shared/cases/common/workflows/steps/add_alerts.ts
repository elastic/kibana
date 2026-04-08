/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { Rule } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../constants';

export const AddAlertsStepTypeId = 'cases.addAlerts';

const AlertInputSchema = z.object({
  alertId: z.string().min(1, 'alertId is required'),
  index: z.string().min(1, 'index is required'),
  rule: Rule.optional(),
});

const InputSchema = CasesStepCaseIdSchema.extend({
  alerts: z.array(AlertInputSchema).min(1).max(MAX_BULK_CREATE_ATTACHMENTS),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type AddAlertsStepInputSchema = typeof InputSchema;
type AddAlertsStepOutputSchema = typeof OutputSchema;

export type AddAlertsStepInput = z.infer<typeof InputSchema>;

export const addAlertsStepCommonDefinition: CommonStepDefinition<
  AddAlertsStepInputSchema,
  AddAlertsStepOutputSchema
> = {
  id: AddAlertsStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ADD_ALERTS_STEP_LABEL,
  description: i18n.ADD_ALERTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_ALERTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add alerts to case
\`\`\`yaml
- name: add_alerts
  type: ${AddAlertsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    alerts:
      - alertId: "alert-1"
        index: ".alerts-security.alerts-default"
        rule:
          id: "rule-1"
          name: "Suspicious process"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
