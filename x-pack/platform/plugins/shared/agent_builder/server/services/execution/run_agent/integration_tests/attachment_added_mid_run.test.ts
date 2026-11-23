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
  messagesText,
  type ScenarioAttachmentType,
  type ScenarioTool,
} from './harness.test_helpers';

const noteType: ScenarioAttachmentType = {
  id: 'note',
  description: 'A note written during the conversation.',
  boundedTools: (attachment) => [
    {
      id: 'note.read',
      description: `Reads note ${attachment.id}`,
      schema: z.object({}),
      handler: () => ({
        results: [
          {
            type: ToolResultType.other,
            data: { text: (attachment.data as { text: string }).text },
          },
        ],
      }),
    },
  ],
};

const addNote: ScenarioTool = {
  id: 'add_note',
  description: 'Writes a note.',
  schema: z.object({ text: z.string() }),
  handler: async ({ text }, context) => {
    const added = await context.attachments.add({ id: 'note-1', type: 'note', data: { text } });
    return { results: [{ type: ToolResultType.other, data: { attachment_id: added.id } }] };
  },
};

describe('a tool adds an attachment during the run', () => {
  it('makes its bound tool callable through execute_dynamic_tool from the next model call, with the native tool list unchanged', async () => {
    const scenario = createScenario({ tools: [addNote], attachmentTypes: [noteType] });

    const { round, calls } = await scenario.turn('Note that the deploy is at 5', [
      { toolCalls: [{ function: { name: 'add_note', arguments: { text: 'deploy at 5' } } }] },
      {
        toolCalls: [
          {
            function: {
              name: 'execute_dynamic_tool',
              arguments: { tool_id: 'note.read', params: {} },
            },
          },
        ],
      },
      'Noted: the deploy is at 5.',
    ]);

    expect(round.response.message).toBe('Noted: the deploy is at 5.');
    const toolCalls = round.steps.filter(isToolCallStep);
    expect(toolCalls.map((step) => step.tool_id)).toEqual(['add_note', 'note.read']);
    expect(toolCalls[1]).toEqual(
      expect.objectContaining({
        invocation: 'dynamic',
        params: {},
        results: [expect.objectContaining({ data: { text: 'deploy at 5' } })],
      })
    );

    // the definition is in the conversation once the attachment event is, not before
    expect(messagesText(calls[0])).not.toContain('note.read');
    expect(messagesText(calls[1])).toContain('note.read');
    expect(calls[0].tools).toHaveProperty('add_note');
    expect(calls[0].tools).not.toHaveProperty('note.read');
    expect(calls.map((call) => call.tools)).toEqual(calls.map(() => calls[0].tools));
    expectAppendOnly(calls);
  });

  it('keeps the bound tool callable on the next turn, extending the previous turn’s messages', async () => {
    const scenario = createScenario({ tools: [addNote], attachmentTypes: [noteType] });
    const first = await scenario.turn('Note that the deploy is at 5', [
      { toolCalls: [{ function: { name: 'add_note', arguments: { text: 'deploy at 5' } } }] },
      'Noted.',
    ]);

    const second = await scenario.turn('When is the deploy?', [
      {
        toolCalls: [
          {
            function: {
              name: 'execute_dynamic_tool',
              arguments: { tool_id: 'note.read', params: {} },
            },
          },
        ],
      },
      'At 5.',
    ]);

    expect(second.round.response.message).toBe('At 5.');
    expect(second.round.steps.filter(isToolCallStep)).toEqual([
      expect.objectContaining({
        tool_id: 'note.read',
        invocation: 'dynamic',
        results: [expect.objectContaining({ data: { text: 'deploy at 5' } })],
      }),
    ]);
    // described in the stored conversation on the next turn, still after the attachment event
    expect(messagesText(first.calls[0])).not.toContain('note.read');
    expect(messagesText(second.calls[0])).toContain('note.read');
    expect(second.calls[0].tools).toEqual(first.calls[0].tools);
    expectAppendOnly([...first.calls, ...second.calls]);
  });

  it('keeps the system prompt byte identical when the second round attaches a note', async () => {
    const scenario = createScenario({ tools: [addNote], attachmentTypes: [noteType] });
    const first = await scenario.turn('Hello', ['Hi, how can I help?']);

    const second = await scenario.turn(
      {
        message: 'Read my note',
        attachments: [{ type: 'note', data: { text: 'deploy at 5' } }],
      },
      [
        {
          toolCalls: [
            {
              function: {
                name: 'execute_dynamic_tool',
                arguments: { tool_id: 'note.read', params: {} },
              },
            },
          ],
        },
        'Your note says the deploy is at 5.',
      ]
    );

    expect(second.round.response.message).toBe('Your note says the deploy is at 5.');
    expect(second.round.steps.filter(isToolCallStep)).toEqual([
      expect.objectContaining({ tool_id: 'note.read', invocation: 'dynamic' }),
    ]);
    const allCalls = [...first.calls, ...second.calls];
    expect(allCalls).toHaveLength(3);
    allCalls.forEach((call) => {
      expect(call.system).toBe(first.calls[0].system);
      expect(call.tools).toEqual(first.calls[0].tools);
    });
    // the definition comes with the attachment event, in the second round's messages
    expect(messagesText(first.calls[0])).not.toContain('note.read');
    expect(messagesText(second.calls[0])).toContain('note.read');
    expectAppendOnly(allCalls);
  });
});
