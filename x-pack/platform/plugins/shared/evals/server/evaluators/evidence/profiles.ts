/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceMappingOverrides, EvidenceMappingProfileDefinition } from './types';

const otelGenAiEvents: EvidenceMappingProfileDefinition = {
  mapping: {
    user_query: {
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.user.message' }],
      fields: {
        content: 'body.structured.content',
      },
      select: 'first',
      parse: 'string',
    },
    agent_response: {
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.choice' }],
      fields: {
        content: 'body.structured.message.content',
      },
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
      select: 'all',
      parse: 'json',
    },
  },
};

const elasticInferenceOverrides: EvidenceMappingOverrides = {
  user_query: {
    fields: {
      content: 'attributes.content',
    },
  },
  agent_response: {
    fields: {
      content: 'attributes.message.content',
    },
  },
  tool_calls: {
    filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
  },
};

const otelGenAiAttributes: EvidenceMappingProfileDefinition = {
  mapping: {
    user_query: {
      source: 'traces',
      filter: [],
      fields: {
        messages: 'attributes.gen_ai.input.messages',
      },
      select: 'first',
      parse: 'genai_messages',
    },
    agent_response: {
      source: 'traces',
      filter: [],
      fields: {
        messages: 'attributes.gen_ai.output.messages',
      },
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
      select: 'all',
      parse: 'json',
    },
  },
};

export const EVIDENCE_MAPPING_PROFILES: Record<string, EvidenceMappingProfileDefinition> = {
  'otel-genai-events': otelGenAiEvents,
  'elastic-inference': {
    extends: 'otel-genai-events',
    overrides: elasticInferenceOverrides,
  },
  'otel-genai-attributes': otelGenAiAttributes,
};
