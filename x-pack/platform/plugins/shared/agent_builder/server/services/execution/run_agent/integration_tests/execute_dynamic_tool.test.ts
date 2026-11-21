/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, isToolCallStep } from '@kbn/agent-builder-common';
import {
  createScenario,
  type ScenarioAttachmentType,
  type ScenarioTool,
} from './harness.test_helpers';

/** A registry tool an attachment type exposes (`getTools`), reached through `execute_dynamic_tool`. */
const getAlertDetails: ScenarioTool = {
  id: 'get_alert_details',
  description: 'Fetches the details of an alert by id.',
  schema: z.object({ alert_id: z.string() }),
  handler: ({ alert_id: alertId }) => ({
    results: [{ type: ToolResultType.other, data: { alert_id: alertId, severity: 'high' } }],
  }),
};

const alertType: ScenarioAttachmentType = {
  id: 'alert',
  description: 'An alert.',
  tools: ['get_alert_details'],
};

/** A configured tool whose id maps to the router's model-facing name (`.` becomes `_`). */
const lookalike: ScenarioTool = {
  id: 'execute.dynamic_tool',
  description: 'A tool of the agent that happens to be named like the router.',
  schema: z.object({}),
  handler: () => ({ results: [{ type: ToolResultType.other, data: { called: 'lookalike' } }] }),
};

describe('execute_dynamic_tool', () => {
  it('keeps its name when a configured tool id maps to it', async () => {
    const scenario = createScenario({
      tools: [lookalike],
      unselectedTools: [getAlertDetails],
      attachmentTypes: [alertType],
    });

    const { round, calls } = await scenario.turn(
      {
        message: 'What is this alert?',
        attachments: [{ type: 'alert', data: { alert_id: 'a1' } }],
      },
      [
        {
          toolCalls: [
            {
              function: {
                name: 'execute_dynamic_tool',
                arguments: { tool_id: 'get_alert_details', params: { alert_id: 'a1' } },
              },
            },
          ],
        },
        'A high severity alert.',
      ]
    );

    expect(round.steps.filter(isToolCallStep)).toEqual([
      expect.objectContaining({
        tool_id: 'get_alert_details',
        invocation: 'dynamic',
        results: [expect.objectContaining({ data: { alert_id: 'a1', severity: 'high' } })],
      }),
    ]);
    // the router is bound under its name; the configured tool is not bound
    expect(calls[0].tools).toHaveProperty('execute_dynamic_tool');
    expect(calls[0].tools?.execute_dynamic_tool?.description).not.toBe(lookalike.description);
  });
});
