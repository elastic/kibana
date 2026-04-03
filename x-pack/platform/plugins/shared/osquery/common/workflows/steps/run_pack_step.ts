/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const RunPackStepTypeId = 'osquery.runPack';

export const RunPackInputSchema = z.object({
  pack_id: z.string().min(1, 'pack_id is required'),
  agent_ids: z.array(z.string()).optional(),
  agent_all: z.boolean().optional(),
  agent_platforms: z.array(z.string()).optional(),
  agent_policy_ids: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  alert_ids: z.array(z.string()).optional(),
  case_ids: z.array(z.string()).optional(),
  event_ids: z.array(z.string()).optional(),
});

export const RunPackOutputSchema = z.object({
  action_id: z.string(),
  total_agents: z.number(),
  query_action_ids: z.array(z.string()),
  queries: z.array(z.object({
    action_id: z.string(),
    name: z.string(),
  })),
});

export const RunPackConfigSchema = z.object({}).partial();

export type RunPackStepInput = z.infer<typeof RunPackInputSchema>;
export type RunPackStepOutput = z.infer<typeof RunPackOutputSchema>;

export const runPackStepCommonDefinition: CommonStepDefinition<
  typeof RunPackInputSchema,
  typeof RunPackOutputSchema,
  typeof RunPackConfigSchema
> = {
  id: RunPackStepTypeId,
  category: StepCategory.Kibana,
  label: 'Run a query pack',
  description:
    'Run all queries in an osquery pack on targeted endpoints and return the action metadata.',
  documentation: {
    details:
      'Executes all queries in a saved osquery pack on Fleet-enrolled agents. Returns immediately with action IDs — use a wait step followed by osquery.getResults for each query to collect results.',
    examples: [
      `## Run a compliance pack on all agents
\`\`\`yaml
- name: run_pack
  type: ${RunPackStepTypeId}
  with:
    pack_id: "compliance-check"
    agent_all: true

- name: wait_for_results
  type: wait
  with:
    duration: "60s"

- name: get_results
  type: osquery.getResults
  with:
    action_id: "{{ steps.run_pack.output.action_id }}"
    query_action_id: "{{ steps.run_pack.output.query_action_ids[0] }}"
\`\`\``,
    ],
  },
  inputSchema: RunPackInputSchema,
  outputSchema: RunPackOutputSchema,
  configSchema: RunPackConfigSchema,
};
