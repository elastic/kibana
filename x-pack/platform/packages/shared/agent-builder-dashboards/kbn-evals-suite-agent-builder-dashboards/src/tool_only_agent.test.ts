/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardRoutingEvaluator } from './evaluators/dashboard_routing';
import { GENERATE_DASHBOARD_TOOL_ID } from './extract_dashboard';
import { TOOL_ONLY_AGENT_ID, toToolOnlyExample, toolOnlyAgentDefinition } from './tool_only_agent';
import type { DashboardAgentTaskOutput, DashboardDatasetExample } from './types';

const chatExample: DashboardDatasetExample = {
  input: { question: 'Create a dashboard of my logs.' },
  metadata: { behaviour: 'creation', dataSource: 'logs' },
  output: {
    route: 'dashboard',
    structure: { panelCount: { min: 10 } },
    goldenToolPath: ['load_skill', GENERATE_DASHBOARD_TOOL_ID],
  },
};

const outputWithoutSkill: DashboardAgentTaskOutput = {
  errors: [],
  messages: [{ message: 'Done.' }],
  steps: [{ type: 'tool_call', tool_id: GENERATE_DASHBOARD_TOOL_ID }],
};

const scoreRouting = ({ input, output, metadata }: DashboardDatasetExample) =>
  dashboardRoutingEvaluator.evaluate({
    input,
    expected: output,
    metadata,
    output: outputWithoutSkill,
  });

describe('tool-only agent', () => {
  it('has the dashboard tool but no skills', () => {
    const { configuration } = toolOnlyAgentDefinition;
    expect(configuration.tools.flatMap(({ tool_ids: toolIds }) => toolIds)).toContain(
      GENERATE_DASHBOARD_TOOL_ID
    );
    expect(configuration.skill_ids).toEqual([]);
    expect(configuration.enable_elastic_capabilities).toBe(false);
  });

  it('runs the example on the tool-only agent with the same gold, minus loading the skill', () => {
    expect(toToolOnlyExample(chatExample)).toEqual({
      input: chatExample.input,
      metadata: { behaviour: 'creation', dataSource: 'logs', agentId: TOOL_ONLY_AGENT_ID },
      output: {
        route: 'dashboard',
        structure: { panelCount: { min: 10 } },
        goldenToolPath: [GENERATE_DASHBOARD_TOOL_ID],
      },
    });
  });

  it('skips skill routing on the tool-only agent but still scores it on the chat agent', async () => {
    const toolOnly = await scoreRouting(toToolOnlyExample(chatExample));
    const chat = await scoreRouting(chatExample);

    expect(toolOnly).toMatchObject({ score: null, label: 'skipped' });
    expect(chat.score).toBe(0);
  });
});
