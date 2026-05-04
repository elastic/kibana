/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CreateCaseRequest as CreateCaseRequestSchema } from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema, CasesStepSingleCaseOutputSchema } from './shared';
import * as i18n from '../translations';

export const CreateCaseStepTypeId = 'cases.createCase';

// `tags`, `settings`, `connector` are optional in step definitions.
// They will be filled in with default values if not provided.
// `connector` is omitted because step definitions have a custom connector selector.
export const InputSchema = CreateCaseRequestSchema.partial({
  tags: true,
  settings: true,
}).omit({ connector: true });

export const OutputSchema = CasesStepSingleCaseOutputSchema;

// `connector-id` is what's triggering the connector selector.
const ConfigSchema = CasesStepBaseConfigSchema.extend({
  'connector-id': z.string().optional(),
});

type CreateCaseStepInputSchema = typeof InputSchema;
type CreateCaseStepOutputSchema = typeof OutputSchema;

export type CreateCaseStepInput = z.infer<typeof InputSchema>;
export type CreateCaseStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseStepConfig = z.infer<typeof ConfigSchema>;

export const createCaseStepCommonDefinition: CommonStepDefinition<
  CreateCaseStepInputSchema,
  CreateCaseStepOutputSchema
> = {
  id: CreateCaseStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.CREATE_CASE_STEP_LABEL,
  description: i18n.CREATE_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.CREATE_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Basic case creation
\`\`\`yaml
- name: create_security_case
  type: ${CreateCaseStepTypeId}
  with:
    title: "Security incident detected"
    description: "Suspicious activity detected in system logs"
    tags: ["security", "incident", "automated"]
    owner: "securitySolution"
    severity: "critical"
    settings:
      syncAlerts: true
      autoExtractObersvables: true
\`\`\``,
      `## Using data from previous steps
\`\`\`yaml
- name: analyze_alerts
  type: elasticsearch.search
  with:
    index: ".alerts-*"
    query:
      match:
        kibana.alert.severity: "critical"

- name: create_case_from_alerts
  type: ${CreateCaseStepTypeId}
  with:
    title: "Automated case from critical alerts"
    description: \${{ "Found " + steps.analyze_alerts.output.hits.total.value + " critical alerts" }}
    tags: ["automated", "critical-alerts"]
    owner: "securitySolution"
    severity: "critical"
    settings:
      syncAlerts: true
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
