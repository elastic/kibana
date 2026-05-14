/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const RunQueryStepTypeId = 'osquery.runQuery';

export const RunQueryInputSchema = z.object({
  saved_query_id: z.string().min(1, 'saved_query_id is required'),
  agent_ids: z.array(z.string()).optional(),
  agent_all: z.boolean().optional(),
  agent_platforms: z.array(z.string()).optional(),
  agent_policy_ids: z.array(z.string()).optional(),
  ecs_mapping: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().optional(),
  alert_ids: z.array(z.string()).optional(),
  case_ids: z.array(z.string()).optional(),
  event_ids: z.array(z.string()).optional(),
});

export const RunQueryOutputSchema = z.object({
  action_id: z.string(),
  total_agents: z.number(),
  query_action_id: z.string(),
});

export const RunQueryConfigSchema = z.object({}).partial();

export type RunQueryStepInput = z.infer<typeof RunQueryInputSchema>;
export type RunQueryStepOutput = z.infer<typeof RunQueryOutputSchema>;

export const runQueryStepCommonDefinition: CommonStepDefinition<
  typeof RunQueryInputSchema,
  typeof RunQueryOutputSchema,
  typeof RunQueryConfigSchema
> = {
  id: RunQueryStepTypeId,
  category: StepCategory.Kibana,
  label: 'Run a saved query',
  description: 'Run an osquery saved query on targeted endpoints and return the action metadata.',
  documentation: {
    details:
      'Executes a saved osquery query on Fleet-enrolled agents. Returns immediately with the action ID — use a wait step followed by osquery.getResults to collect results.',
    examples: [
      `## Run a saved query on specific agents
\`\`\`yaml
- name: run_query
  type: ${RunQueryStepTypeId}
  with:
    saved_query_id: "check-running-processes"
    agent_ids:
      - "{{ event.alerts[0].agent.id }}"

- name: wait_for_results
  type: wait
  with:
    duration: "30s"

- name: get_results
  type: osquery.getResults
  with:
    action_id: "{{ steps.run_query.output.action_id }}"
\`\`\``,
    ],
  },
  inputSchema: RunQueryInputSchema,
  outputSchema: RunQueryOutputSchema,
  configSchema: RunQueryConfigSchema,
};
