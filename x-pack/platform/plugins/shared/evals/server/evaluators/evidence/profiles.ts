/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstrumentationProfile, InstrumentationProfileSpec } from './types';

const otelGenAiEvents: InstrumentationProfileSpec = {
  user_query: {
    source: 'logs',
    filter: [{ field: 'event_name', value: 'gen_ai.user.message' }],
    contentField: 'body.structured.content',
    select: 'first',
    parse: 'string',
  },
  agent_response: {
    source: 'logs',
    filter: [{ field: 'event_name', value: 'gen_ai.choice' }],
    contentField: 'body.structured.message.content',
    select: 'last',
    parse: 'string',
  },
  tool_calls: {
    source: 'traces',
    filter: [{ field: 'attributes.gen_ai.operation.name', value: 'execute_tool' }],
    fields: {
      tool_call_id: 'attributes.gen_ai.tool.call.id',
      tool_id: 'attributes.gen_ai.tool.name',
      arguments: 'attributes.gen_ai.tool.call.arguments',
      result: 'attributes.gen_ai.tool.call.result',
    },
  },
};

const otelGenAiAttributes: InstrumentationProfileSpec = {
  user_query: {
    source: 'traces',
    filter: [],
    contentField: 'attributes.gen_ai.input.messages',
    select: 'first',
    parse: 'genai_messages',
  },
  agent_response: {
    source: 'traces',
    filter: [],
    contentField: 'attributes.gen_ai.output.messages',
    select: 'last',
    parse: 'genai_messages',
  },
  tool_calls: {
    source: 'traces',
    filter: [{ field: 'attributes.gen_ai.operation.name', value: 'execute_tool' }],
    fields: {
      tool_call_id: 'attributes.gen_ai.tool.call.id',
      tool_id: 'attributes.gen_ai.tool.name',
      arguments: 'attributes.gen_ai.tool.call.arguments',
      result: 'attributes.gen_ai.tool.call.result',
    },
  },
};

const elasticInference: InstrumentationProfileSpec = {
  user_query: {
    source: 'traces',
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'LLM' }],
    contentField: 'attributes.gen_ai.input.messages',
    select: 'first',
    parse: 'genai_messages',
  },
  agent_response: {
    source: 'traces',
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'LLM' }],
    contentField: 'attributes.gen_ai.output.messages',
    select: 'last',
    parse: 'genai_messages',
  },
  tool_calls: {
    ...otelGenAiAttributes.tool_calls,
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
  },
};

const claudeCode: InstrumentationProfileSpec = {
  user_query: {
    source: 'logs',
    filter: [{ field: 'event_name', value: 'user_prompt' }],
    contentField: 'attributes.prompt',
    select: 'first',
    parse: 'string',
  },
  agent_response: {
    source: 'logs',
    filter: [{ field: 'event_name', value: 'api_response_body' }],
    contentField: 'attributes.body',
    select: 'last',
    parse: 'anthropic_message',
  },
  tool_calls: {
    source: 'traces',
    filter: [{ field: 'span.name', value: 'claude_code.tool' }],
    parse: 'prefixed_json',
    fields: {
      tool_call_id: 'attributes.tool_use_id',
      tool_id: 'attributes.tool_name',
      arguments: 'attributes.tool_input',
      result: 'attributes.new_context',
    },
  },
};

/**
 * Profile for bare `agentBuilder.tool` runs. A tool execution produces a single
 * TOOL span (Elastic inference convention: `elastic.inference.span.kind = TOOL`)
 * with no surrounding conversation, so there is no gen_ai user/choice message to
 * grade. Instead we treat the tool call itself as the subject: its arguments are
 * the "question" and its result the "answer", which lets the generic LLM judges
 * (e.g. correctness) score a tool the same way they score a conversation turn.
 * `select: 'first'` targets the outermost (root) tool span.
 */
const agentBuilderTool: InstrumentationProfileSpec = {
  user_query: {
    source: 'traces',
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
    contentField: 'attributes.gen_ai.tool.call.arguments',
    select: 'first',
    parse: 'string',
  },
  agent_response: {
    source: 'traces',
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
    contentField: 'attributes.gen_ai.tool.call.result',
    select: 'first',
    parse: 'string',
  },
  tool_calls: {
    ...otelGenAiAttributes.tool_calls,
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
  },
};

export const INSTRUMENTATION_PROFILES: Record<InstrumentationProfile, InstrumentationProfileSpec> =
  {
    'otel-genai-events': otelGenAiEvents,
    'elastic-inference': elasticInference,
    'otel-genai-attributes': otelGenAiAttributes,
    // Native Elastic profile: probed after the conversation profiles so it only wins
    // for bare tool traces (no gen_ai conversation), but before the external
    // claude-code harness profile. In-tool runs select it explicitly regardless.
    'agent-builder-tool': agentBuilderTool,
    'claude-code': claudeCode,
  };
