/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { valueAt } from '../../server/dreaming/trace_rounds';
import { buildRoundTranscript } from '../../server/dreaming/trace_transcripts';
import { roundToSpans, sentMessage, traceIdOf } from './otel_spans';
import type { EvalConversation } from './types';

const agent = { id: 'workarena-agent', name: 'ServiceNow agent' };

const conversation: EvalConversation = {
  id: 't1',
  title: 'Order a laptop',
  rounds: [
    {
      startedAt: '2026-01-05T09:00:00.000Z',
      user: 'Order a Dell XPS developer laptop.',
      steps: [
        {
          thought: 'I will open the service catalog.',
          tool: 'browser',
          arguments: '{"action":"click(\'113\')"}',
          result: "RootWebArea 'Service Catalog | ServiceNow'",
        },
      ],
      answer: 'The task ended in success.',
    },
  ],
};

const spansOf = () =>
  roundToSpans({ dataset: 'longmemeval_v2_enterprise', agent, conversation, roundIndex: 0 });

describe('roundToSpans', () => {
  it('writes the spans Agent Builder does: the agent invocation, the tool calls and the last model call', () => {
    const spans = spansOf();
    const [chain, agentSpan, tool, chat] = spans;

    expect(spans.map(({ name }) => name)).toEqual([
      'invoke_agent ServiceNow agent',
      'invoke_agent ServiceNow agent',
      'execute_tool browser',
      'chat longmemeval_v2_enterprise',
    ]);
    expect(new Set(spans.map(({ trace_id: id }) => id))).toEqual(
      new Set([traceIdOf('longmemeval_v2_enterprise', 't1', 0)])
    );
    expect(agentSpan.parent_span_id).toBe(chain.span_id);
    expect([tool.parent_span_id, chat.parent_span_id]).toEqual([
      agentSpan.span_id,
      agentSpan.span_id,
    ]);
    expect(chain.attributes).toEqual(
      expect.objectContaining({
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.agent.id': 'workarena-agent',
        'gen_ai.agent.name': 'ServiceNow agent',
        'gen_ai.conversation.id': 't1',
        'elastic.conversation.title': 'Order a laptop',
        'elastic.inference.span.kind': 'CHAIN',
      })
    );
    expect(tool.attributes).toEqual(
      expect.objectContaining({
        'gen_ai.operation.name': 'execute_tool',
        'gen_ai.tool.name': 'browser',
        'gen_ai.tool.call.arguments': '{"action":"click(\'113\')"}',
      })
    );
  });

  it('ends the round with its last span, after its tool calls', () => {
    const [chain, , tool, chat] = spansOf();
    const endOf = ({ '@timestamp': at, duration }: { '@timestamp': string; duration: number }) =>
      Date.parse(at) + duration / 1_000_000;

    expect(endOf(chain)).toBe(endOf(chat));
    expect(endOf(tool)).toBeLessThanOrEqual(Date.parse(chat['@timestamp']));
  });

  it('records the round so that trace dreaming reads it back as the same transcript', () => {
    const chat = spansOf()[3];

    expect(
      buildRoundTranscript({
        lastChat: {
          inputMessages: valueAt(chat, 'attributes.gen_ai.input.messages'),
          outputMessages: valueAt(chat, 'attributes.gen_ai.output.messages'),
        },
      })
    ).toBe(
      [
        'User: Order a Dell XPS developer laptop.',
        'Assistant: I will open the service catalog.',
        'Assistant called browser: {"action":"click(\'113\')"}',
        "Tool result: RootWebArea 'Service Catalog | ServiceNow'",
        'Assistant: The task ended in success.',
      ].join('\n')
    );
  });

  it('gives a round the same ids on every import', () => {
    expect(spansOf()).toEqual(spansOf());
    expect(traceIdOf('a', 't1', 0)).not.toBe(traceIdOf('a', 't1', 1));
    expect(sentMessage('Hi', '2026-01-05T09:00:00.000Z')).toBe(
      '[User: user — Sent: 2026-01-05T09:00:00Z]\n\nHi'
    );
  });
});
