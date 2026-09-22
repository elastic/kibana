/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertAgentTrace } from './trace_evidence';

const attributes = [
  {
    'gen_ai.input.messages': JSON.stringify([
      { role: 'user', parts: [{ type: 'text', content: 'Investigate synthetic timeouts.' }] },
    ]),
    'gen_ai.output.messages': JSON.stringify([
      {
        role: 'assistant',
        parts: [{ type: 'text', content: 'Timeouts increased after the change.' }],
      },
    ]),
    'gen_ai.system_instructions': JSON.stringify([
      { type: 'text', content: 'Investigate the evidence.' },
    ]),
    'gen_ai.tool.call.arguments': JSON.stringify({ command: 'python calculate.py' }),
    'gen_ai.tool.call.result': JSON.stringify({ stdout: '30%' }),
    'gen_ai.conversation.id': 'conversation',
  },
];
const expected = { question: 'Investigate synthetic timeouts.', conversationId: 'conversation' };

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
