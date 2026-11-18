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
  expectAppendOnly,
  messageText,
  messagesText,
  type ScenarioAttachmentType,
  type ScenarioTool,
} from './harness.test_helpers';

/** A registry tool an attachment type exposes (`getTools`), not selected by the agent itself. */
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

const attachAlert: ScenarioTool = {
  id: 'attach_alert',
  description: 'Attaches an alert to the conversation.',
  schema: z.object({ alert_id: z.string() }),
  handler: async ({ alert_id: alertId }, context) => {
    const added = await context.attachments.add({
      id: `alert-${alertId}`,
      type: 'alert',
      data: { alert_id: alertId },
    });
    return { results: [{ type: ToolResultType.other, data: { attachment_id: added.id } }] };
  },
};

const definitionCount = (text: string, toolId: string) =>
  (text.match(new RegExp(`"tool_id":\\s*"${toolId}"`, 'g')) ?? []).length;

/**
 * The attachment events of a message with the dynamic tool definitions they carry, as the model
 * reads them. Timestamps are masked: an attachment is created at the time the test runs.
 */
const renderedAttachmentEvents = (text: string) =>
  (
    text.match(/<conversation_event[\s\S]*<\/(?:conversation_event|dynamic_tools)>/)?.[0] ?? ''
  ).replace(/timestamp="[^"]*"/g, 'timestamp="[timestamp]"');

describe('the tools an attachment type exposes (getTools)', () => {
  it('are dynamic tools, described after the attachment event and called through execute_dynamic_tool', async () => {
    const scenario = createScenario({
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

    expect(round.response.message).toBe('A high severity alert.');
    expect(round.steps.filter(isToolCallStep)).toEqual([
      expect.objectContaining({
        tool_id: 'get_alert_details',
        invocation: 'dynamic',
        params: { alert_id: 'a1' },
        results: [expect.objectContaining({ data: { alert_id: 'a1', severity: 'high' } })],
      }),
    ]);
    expect(calls[0].tools).not.toHaveProperty('get_alert_details');
    expect(definitionCount(messagesText(calls[0]), 'get_alert_details')).toBe(1);
    expectAppendOnly(calls);
  });

  it('become callable in the round a tool attaches the first attachment of the type, with the native tool list unchanged', async () => {
    const scenario = createScenario({
      tools: [attachAlert],
      unselectedTools: [getAlertDetails],
      attachmentTypes: [alertType],
    });

    const first = await scenario.turn('Look at alert a1', [
      { toolCalls: [{ function: { name: 'attach_alert', arguments: { alert_id: 'a1' } } }] },
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
      'Attached and read a1.',
    ]);
    const second = await scenario.turn('And again?', [
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
      'Still high.',
    ]);

    expect(first.round.steps.filter(isToolCallStep).map((step) => step.tool_id)).toEqual([
      'attach_alert',
      'get_alert_details',
    ]);
    expect(second.round.response.message).toBe('Still high.');
    // not described before the attachment exists, described once it does
    expect(definitionCount(messagesText(first.calls[0]), 'get_alert_details')).toBe(0);
    expect(definitionCount(messagesText(first.calls[1]), 'get_alert_details')).toBe(1);
    // the native tool list is the same for every call of both turns
    const allCalls = [...first.calls, ...second.calls];
    expect(allCalls.map((call) => call.tools)).toEqual(allCalls.map(() => first.calls[0].tools));
    expect(first.calls[0].tools).not.toHaveProperty('get_alert_details');
    expectAppendOnly(allCalls);
  });

  it('are described once however many attachments of the type there are', async () => {
    const scenario = createScenario({
      tools: [attachAlert],
      unselectedTools: [getAlertDetails],
      attachmentTypes: [alertType],
    });

    const { calls } = await scenario.turn(
      {
        message: 'Compare these alerts',
        attachments: [
          { type: 'alert', data: { alert_id: 'a1' } },
          { type: 'alert', data: { alert_id: 'a2' } },
        ],
      },
      [
        { toolCalls: [{ function: { name: 'attach_alert', arguments: { alert_id: 'a3' } } }] },
        'Three alerts.',
      ]
    );

    expect(definitionCount(messagesText(calls[0]), 'get_alert_details')).toBe(1);
    expect(definitionCount(messagesText(calls[1]), 'get_alert_details')).toBe(1);
  });

  it('are rendered in a <dynamic_tools> block after the first attachment event of the type', async () => {
    const scenario = createScenario({
      unselectedTools: [getAlertDetails],
      attachmentTypes: [alertType],
    });

    const { calls } = await scenario.turn(
      {
        message: 'Compare these alerts',
        attachments: [
          { id: 'alert-a1', type: 'alert', data: { alert_id: 'a1' } },
          { id: 'alert-a2', type: 'alert', data: { alert_id: 'a2' } },
        ],
      },
      ['Two alerts.']
    );

    expect(renderedAttachmentEvents(messageText(calls[0].messages[0]))).toBe(
      `<conversation_event type="attachment_added" timestamp="[timestamp]">
  <attachment attachment_id="alert-a1" attachment_type="alert" version="1" actor="user" source="chat_input" />
</conversation_event>
<dynamic_tools>{"tool_id":"get_alert_details","description":"Fetches the details of an alert by id.","parameters":{"type":"object","properties":{"alert_id":{"type":"string"}},"required":["alert_id"]}}</dynamic_tools>
<conversation_event type="attachment_added" timestamp="[timestamp]">
  <attachment attachment_id="alert-a2" attachment_type="alert" version="1" actor="user" source="chat_input" />
</conversation_event>`
    );
  });

  it('are not described when the agent already has them in its tool list', async () => {
    const searchAlerts: ScenarioTool = {
      id: 'search_alerts',
      description: 'Searches alerts.',
      schema: z.object({ query: z.string() }),
      handler: () => ({ results: [{ type: ToolResultType.other, data: { total: 0 } }] }),
    };
    const scenario = createScenario({
      // the agent's configuration selects `search_alerts`, so it is in the native tool list
      tools: [searchAlerts],
      unselectedTools: [getAlertDetails],
      attachmentTypes: [{ ...alertType, tools: ['search_alerts', 'get_alert_details'] }],
    });

    const { calls } = await scenario.turn(
      {
        message: 'What is this alert?',
        attachments: [{ id: 'alert-a1', type: 'alert', data: { alert_id: 'a1' } }],
      },
      ['An alert.']
    );

    expect(calls[0].tools).toHaveProperty('search_alerts');
    expect(calls[0].tools).not.toHaveProperty('get_alert_details');
    // only the tool the agent cannot call natively is described
    expect(renderedAttachmentEvents(messageText(calls[0].messages[0]))).toBe(
      `<conversation_event type="attachment_added" timestamp="[timestamp]">
  <attachment attachment_id="alert-a1" attachment_type="alert" version="1" actor="user" source="chat_input" />
</conversation_event>
<dynamic_tools>{"tool_id":"get_alert_details","description":"Fetches the details of an alert by id.","parameters":{"type":"object","properties":{"alert_id":{"type":"string"}},"required":["alert_id"]}}</dynamic_tools>`
    );
  });
});
