/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import { assertAgentTrace } from './trace_evidence';

const toolCall = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call',
  tool_id: 'nightshift_sandbox_bash',
  params: { command: 'python calculate.py' },
  results: [{ tool_result_id: 'result', type: ToolResultType.other, data: { stdout: '30%' } }],
} satisfies ToolCallStep;
const toolCallPart = {
  type: 'tool_call',
  id: toolCall.tool_call_id,
  name: toolCall.tool_id,
  arguments: JSON.stringify(toolCall.params),
};

const attributes = [
  {
    'gen_ai.input.messages': JSON.stringify([
      { role: 'user', parts: [{ type: 'text', content: 'Investigate synthetic timeouts.' }] },
    ]),
    'gen_ai.output.messages': JSON.stringify([
      {
        role: 'assistant',
        parts: [{ type: 'text', content: 'Timeouts increased after the change.' }, toolCallPart],
      },
    ]),
    'gen_ai.system_instructions': JSON.stringify([
      { type: 'text', content: 'Investigate the evidence.' },
    ]),
    'gen_ai.tool.call.id': toolCall.tool_call_id,
    'gen_ai.tool.name': toolCall.tool_id,
    'gen_ai.tool.call.arguments': JSON.stringify(toolCall.params),
    'gen_ai.tool.call.result': JSON.stringify({ results: toolCall.results }),
    'gen_ai.conversation.id': 'conversation',
  },
];
const expected = {
  question: 'Investigate synthetic timeouts.',
  conversationId: 'conversation',
  systemInstructions: 'Investigate the evidence.',
  rounds: [{ steps: [toolCall], response: { message: 'Timeouts increased after the change.' } }],
};

it('accepts full payload evidence for the investigation conversation', () => {
  expect(() => assertAgentTrace(attributes, expected)).not.toThrow();
});

it('rejects a trace that retains message attributes but has redacted the user question', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.input.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: expected.question }] },
          ]),
        },
      ],
      expected
    )
  ).toThrow('user question');
});

it('rejects a trace linked to another conversation', () => {
  expect(() => assertAgentTrace(attributes, { ...expected, conversationId: 'other' })).toThrow(
    'conversation'
  );
});

it.each([
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
  'gen_ai.system_instructions',
  'gen_ai.output.messages',
])('rejects missing %s payloads', (field) => {
  expect(() => assertAgentTrace([{ ...attributes[0], [field]: '' }], expected)).toThrow();
});

it.each(['gen_ai.tool.call.arguments', 'gen_ai.tool.call.result', 'gen_ai.system_instructions'])(
  'rejects nonempty redacted, malformed and mismatched %s payloads',
  (field) => {
    for (const value of ['"[REDACTED]"', '{broken', '{"different":"payload"}']) {
      expect(() => assertAgentTrace([{ ...attributes[0], [field]: value }], expected)).toThrow();
    }
  }
);

it('rejects a structurally valid redacted system prompt', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: '[REDACTED]' }]),
        },
      ],
      expected
    )
  ).toThrow();
});

it('requires every conversation tool call to have a corresponding span', () => {
  expect(() =>
    assertAgentTrace(attributes, {
      ...expected,
      rounds: [
        { ...expected.rounds[0], steps: [toolCall, { ...toolCall, tool_call_id: 'missing' }] },
      ],
    })
  ).toThrow();
});

it('rejects changed tool result content', () => {
  expect(() =>
    assertAgentTrace(attributes, {
      ...expected,
      rounds: [
        {
          ...expected.rounds[0],
          steps: [
            { ...toolCall, results: [{ ...toolCall.results[0], data: { stdout: 'different' } }] },
          ],
        },
      ],
    })
  ).toThrow();
});

it('allows result IDs assigned after the tool span ends', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.tool.call.result': JSON.stringify({
            results: [{ type: ToolResultType.other, data: { stdout: '30%' } }],
          }),
        },
      ],
      expected
    )
  ).not.toThrow();
});

it.each([
  [{ type: ToolResultType.error, data: { message: 'Sandbox unavailable' } }],
  { error: 'Sandbox unavailable' },
])('accepts matching tool error evidence: %j', (result) => {
  expect(() =>
    assertAgentTrace([{ ...attributes[0], 'gen_ai.tool.call.result': JSON.stringify(result) }], {
      ...expected,
      rounds: [
        {
          ...expected.rounds[0],
          steps: [
            {
              ...toolCall,
              results: [
                {
                  tool_result_id: 'error',
                  type: ToolResultType.error,
                  data: { message: 'Sandbox unavailable' },
                },
              ],
            },
          ],
        },
      ],
    })
  ).not.toThrow();
});

it('rejects redacted responses even when all tool and system payloads remain intact', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.output.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: '[REDACTED]' }] },
          ]),
        },
      ],
      expected
    )
  ).toThrow();
});

it('accepts structured final responses exported as tool-call arguments', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.output.messages': JSON.stringify([
            {
              role: 'assistant',
              parts: [
                {
                  type: 'tool_call',
                  id: 'final',
                  name: 'structuredResponse',
                  arguments: '{ "conclusion": "Timeouts increased." }',
                },
                toolCallPart,
              ],
            },
          ]),
        },
      ],
      {
        ...expected,
        rounds: [
          { ...expected.rounds[0], response: { message: '{"conclusion":"Timeouts increased."}' } },
        ],
      }
    )
  ).not.toThrow();
});

it.each(['missing', 'redacted'])(
  'rejects %s intermediate model tool calls despite complete final and execution evidence',
  (mode) => {
    expect(() =>
      assertAgentTrace(
        [
          {
            ...attributes[0],
            'gen_ai.output.messages': JSON.stringify([
              {
                role: 'assistant',
                parts: [
                  { type: 'text', content: expected.rounds[0].response.message },
                  ...(mode === 'missing' ? [] : [{ ...toolCallPart, arguments: '"[REDACTED]"' }]),
                ],
              },
            ]),
          },
        ],
        expected
      )
    ).toThrow();
  }
);

const validationError = 'Error: Received tool input did not match expected schema: missing summary';

it.each([
  ['matching', '{}', validationError, '{"bad":"input"}', validationError, true],
  [
    'changed arguments',
    '{"unexpected":true}',
    validationError,
    '{"bad":"input"}',
    validationError,
    false,
  ],
  ['redacted result', '{}', '[REDACTED]', '{"bad":"input"}', validationError, false],
  ['missing result', '{}', '', '{"bad":"input"}', validationError, false],
  ['redacted original call', '{}', validationError, '"[REDACTED]"', validationError, false],
  ['missing original call', '{}', validationError, '', validationError, false],
  ['ordinary tool failure', '{}', 'Sandbox unavailable', '{}', 'Sandbox unavailable', false],
])(
  'checks pre-execution validation errors in LLM messages: %s',
  (_name, args, error, attempted, storedError, accepted) => {
    const rejectedCall = {
      ...toolCall,
      tool_call_id: 'rejected',
      params: {},
      results: [
        { tool_result_id: 'error', type: ToolResultType.error, data: { message: storedError } },
      ],
    };
    const tracedMessages = {
      'gen_ai.output.messages': JSON.stringify([
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool_call',
              id: 'rejected',
              name: toolCall.tool_id,
              arguments: attempted,
            },
          ],
        },
      ]),
      'gen_ai.input.messages': JSON.stringify([
        {
          role: 'assistant',
          parts: [{ type: 'tool_call', id: 'rejected', name: toolCall.tool_id, arguments: args }],
        },
        {
          role: 'tool',
          parts: [
            {
              type: 'tool_call_response',
              id: 'rejected',
              response: JSON.stringify({ response: `<tool_result>${error}</tool_result>` }),
            },
          ],
        },
      ]),
    };
    const check = () =>
      assertAgentTrace([...attributes, tracedMessages], {
        ...expected,
        rounds: [{ ...expected.rounds[0], steps: [toolCall, rejectedCall] }],
      });
    if (accepted) {
      expect(check).not.toThrow();
    } else {
      expect(check).toThrow();
    }
  }
);
