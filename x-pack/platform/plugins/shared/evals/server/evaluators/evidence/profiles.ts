/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceMapping, EvidenceProfile } from './types';

const otelGenAiEventsBase: EvidenceMapping = {
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

const otelGenAiEvents: EvidenceMapping = {
  ...otelGenAiEventsBase,
};

const elasticInference: EvidenceMapping = {
  ...otelGenAiEventsBase,
  user_query: {
    ...otelGenAiEventsBase.user_query,
    contentField: 'attributes.content',
  },
  agent_response: {
    ...otelGenAiEventsBase.agent_response,
    contentField: 'attributes.message.content',
  },
  tool_calls: {
    ...otelGenAiEventsBase.tool_calls,
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

export const EVIDENCE_MAPPING_PROFILES: Record<EvidenceProfile, EvidenceMapping> = {
  'otel-genai-events': otelGenAiEvents,
  'elastic-inference': elasticInference,
  'otel-genai-attributes': otelGenAiAttributes,
};
