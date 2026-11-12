/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { EvalConversation, EvalRound } from './types';

/** A span document as Agent Builder writes it to `traces-agent_builder.otel-<space>`. */
export interface SpanDocument {
  '@timestamp': string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: 'Internal' | 'Client';
  /** Nanoseconds. */
  duration: number;
  status: { code: 'Ok' };
  attributes: Record<string, string>;
  resource: { attributes: Record<string, string> };
}

interface MessagePart {
  type: 'text' | 'tool_call' | 'tool_call_response';
  [key: string]: string;
}

interface Message {
  role: 'user' | 'assistant' | 'tool';
  parts: MessagePart[];
  finish_reason?: string;
}

/** The user Agent Builder names in the header of each message it sends the model. */
const SENDER = 'user';

/** Seconds the model takes to answer, and that each tool call takes at most. */
const ANSWER_SECONDS = 20;
const STEP_SECONDS = 20;
/** A round's tool calls fit in this many seconds, so long trajectories do not run into the next. */
const MAX_STEPS_SECONDS = 50 * 60;

const NANOS_PER_SECOND = 1_000_000_000;

const hash = (...parts: string[]): string =>
  createHash('sha256').update(parts.join('|')).digest('hex');

/** The trace id of a round, the same for every import of it, so a re-import replaces it. */
export const traceIdOf = (dataset: string, conversationId: string, roundIndex: number): string =>
  hash(dataset, conversationId, String(roundIndex)).slice(0, 32);

/** How Agent Builder sends a user message: headed with who sent it and when. */
export const sentMessage = (text: string, sentAt: string): string =>
  `[User: ${SENDER} — Sent: ${sentAt.replace(/\.\d{3}Z$/, 'Z')}]\n\n${text}`;

const toolCallId = (traceId: string, index: number): string =>
  `call_${hash(traceId, 'call', String(index)).slice(0, 12)}`;

/**
 * The messages of a round's last model call: what the user sent, then each tool call with its
 * result. Agent Builder puts its tool calls in the input of the next model call, so the last call's
 * input is the whole round and its output the answer.
 */
export const roundMessages = (
  round: EvalRound,
  traceId: string
): { input: Message[]; output: Message[] } => {
  const input: Message[] = [
    { role: 'user', parts: [{ type: 'text', content: sentMessage(round.user, round.startedAt) }] },
  ];
  round.steps.forEach((step, index) => {
    const id = toolCallId(traceId, index);
    input.push({
      role: 'assistant',
      parts: [
        ...(step.thought ? [{ type: 'text' as const, content: step.thought }] : []),
        { type: 'tool_call', id, name: step.tool, arguments: step.arguments },
      ],
    });
    input.push({
      role: 'tool',
      parts: [
        {
          type: 'tool_call_response',
          id,
          response: JSON.stringify({ response: `<tool_result>${step.result}</tool_result>` }),
        },
      ],
    });
  });
  return {
    input,
    output: [
      {
        role: 'assistant',
        finish_reason: 'stop',
        parts: [{ type: 'text', content: round.answer }],
      },
    ],
  };
};

/** The spans of one round: the agent invocation, a span per tool call, and the last model call. */
export const roundToSpans = ({
  dataset,
  agent,
  conversation,
  roundIndex,
}: {
  dataset: string;
  agent: { id: string; name: string };
  conversation: EvalConversation;
  roundIndex: number;
}): SpanDocument[] => {
  const round = conversation.rounds[roundIndex];
  const traceId = traceIdOf(dataset, conversation.id, roundIndex);
  const spanId = (name: string) => hash(traceId, name).slice(0, 16);
  const start = Date.parse(round.startedAt);
  const stepSeconds = Math.min(STEP_SECONDS, MAX_STEPS_SECONDS / Math.max(round.steps.length, 1));
  const answerAt = start + round.steps.length * stepSeconds * 1000;
  const end = answerAt + ANSWER_SECONDS * 1000;

  const at = (millis: number) => new Date(millis).toISOString();
  const nanos = (millis: number) => Math.round(millis * (NANOS_PER_SECOND / 1000));
  const common = {
    'gen_ai.conversation.id': conversation.id,
    'dreaming_eval.dataset': dataset,
  };
  const invokeAgent = {
    ...common,
    'gen_ai.operation.name': 'invoke_agent',
    'gen_ai.agent.id': agent.id,
    'gen_ai.agent.name': agent.name,
    'elastic.conversation.title': conversation.title,
  };
  const base = {
    trace_id: traceId,
    status: { code: 'Ok' as const },
    resource: { attributes: { 'service.name': 'kibana' } },
  };

  const chain: SpanDocument = {
    ...base,
    '@timestamp': at(start),
    span_id: spanId('chain'),
    name: `invoke_agent ${agent.name}`,
    kind: 'Internal',
    duration: nanos(end - start),
    attributes: { ...invokeAgent, 'elastic.inference.span.kind': 'CHAIN' },
  };
  const agentSpan: SpanDocument = {
    ...base,
    '@timestamp': at(start),
    span_id: spanId('agent'),
    parent_span_id: chain.span_id,
    name: `invoke_agent ${agent.name}`,
    kind: 'Internal',
    duration: nanos(end - start),
    attributes: { ...invokeAgent, 'elastic.inference.span.kind': 'AGENT' },
  };
  const tools = round.steps.map(
    (step, index): SpanDocument => ({
      ...base,
      '@timestamp': at(start + index * stepSeconds * 1000),
      span_id: spanId(`tool-${index}`),
      parent_span_id: agentSpan.span_id,
      name: `execute_tool ${step.tool}`,
      kind: 'Internal',
      duration: nanos(stepSeconds * 1000),
      attributes: {
        ...common,
        'gen_ai.operation.name': 'execute_tool',
        'elastic.inference.span.kind': 'TOOL',
        'gen_ai.tool.name': step.tool,
        'gen_ai.tool.call.id': toolCallId(traceId, index),
        'gen_ai.tool.call.arguments': step.arguments,
        'gen_ai.tool.call.result': step.result,
      },
    })
  );
  const { input, output } = roundMessages(round, traceId);
  const chat: SpanDocument = {
    ...base,
    '@timestamp': at(answerAt),
    span_id: spanId('chat'),
    parent_span_id: agentSpan.span_id,
    name: `chat ${dataset}`,
    kind: 'Client',
    duration: nanos(ANSWER_SECONDS * 1000),
    attributes: {
      ...common,
      'gen_ai.operation.name': 'chat',
      'elastic.inference.span.kind': 'LLM',
      'gen_ai.request.model': dataset,
      'gen_ai.input.messages': JSON.stringify(input),
      'gen_ai.output.messages': JSON.stringify(output),
    },
  };
  return [chain, agentSpan, ...tools, chat];
};
