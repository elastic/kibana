/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceMapping, EvidenceProfile } from './types';

const otelGenAiEvents: EvidenceMapping = {
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

const elasticInference: EvidenceMapping = {
  ...otelGenAiEvents,
  user_query: {
    ...otelGenAiEvents.user_query,
    contentField: 'attributes.content',
  },
  agent_response: {
    ...otelGenAiEvents.agent_response,
    contentField: 'attributes.message.content',
  },
  tool_calls: {
    ...otelGenAiEvents.tool_calls,
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
  },
};

const otelGenAiAttributes: EvidenceMapping = {
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

const claudeCode: EvidenceMapping = {
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

export const AGENT_BUILDER_TOOL_PROFILE = 'agent-builder-tool';

const agentBuilderTool: EvidenceMapping = {
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
    select: 'last',
    parse: 'string',
  },
  tool_calls: {
    source: 'traces',
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
    fields: {
      tool_call_id: 'attributes.gen_ai.tool.call.id',
      tool_id: 'attributes.gen_ai.tool.name',
      arguments: 'attributes.gen_ai.tool.call.arguments',
      result: 'attributes.gen_ai.tool.call.result',
    },
  },
};

export const EVIDENCE_MAPPING_PROFILES: Record<EvidenceProfile, EvidenceMapping> = {
  'otel-genai-events': otelGenAiEvents,
  'elastic-inference': elasticInference,
  'otel-genai-attributes': otelGenAiAttributes,
  'claude-code': claudeCode,
  [AGENT_BUILDER_TOOL_PROFILE]: agentBuilderTool,
};
