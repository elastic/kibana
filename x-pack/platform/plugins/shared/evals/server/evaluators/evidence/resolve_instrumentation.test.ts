/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstrumentationProfile } from './resolve_instrumentation';
import { INSTRUMENTATION_PROFILES } from './profiles';

describe('getInstrumentationProfile', () => {
  it('resolves elastic-inference to the current Kibana field paths and filters', () => {
    const mapping = getInstrumentationProfile('elastic-inference');

    expect(mapping.user_query).toEqual({
      source: 'traces',
      filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'LLM' }],
      contentField: 'attributes.gen_ai.input.messages',
      select: 'first',
      parse: 'genai_messages',
    });

    expect(mapping.agent_response).toEqual({
      source: 'traces',
      filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'LLM' }],
      contentField: 'attributes.gen_ai.output.messages',
      select: 'last',
      parse: 'genai_messages',
    });

    expect(mapping.tool_calls).toEqual({
      source: 'traces',
      filter: [{ field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
      fields: {
        tool_call_id: 'attributes.gen_ai.tool.call.id',
        tool_id: 'attributes.gen_ai.tool.name',
        arguments: 'attributes.gen_ai.tool.call.arguments',
        result: 'attributes.gen_ai.tool.call.result',
      },
    });
  });

  it('throws when profile is unknown', () => {
    expect(() =>
      getInstrumentationProfile('does-not-exist' as Parameters<typeof getInstrumentationProfile>[0])
    ).toThrow('Unknown instrumentation profile: does-not-exist');
  });

  it('resolves claude-code to the expected field paths and filters', () => {
    const mapping = getInstrumentationProfile('claude-code');

    expect(mapping.user_query).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'user_prompt' }],
      contentField: 'attributes.prompt',
      select: 'first',
      parse: 'string',
    });

    expect(mapping.agent_response).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'api_response_body' }],
      contentField: 'attributes.body',
      select: 'last',
      parse: 'anthropic_message',
    });

    expect(mapping.tool_calls).toEqual({
      source: 'traces',
      filter: [{ field: 'span.name', value: 'claude_code.tool' }],
      parse: 'prefixed_json',
      fields: {
        tool_call_id: 'attributes.tool_use_id',
        tool_id: 'attributes.tool_name',
        arguments: 'attributes.tool_input',
        result: 'attributes.new_context',
      },
    });
  });

  it('keeps claude-code as the last profile key', () => {
    const profileKeys = Object.keys(INSTRUMENTATION_PROFILES);
    expect(profileKeys.at(-1)).toBe('claude-code');
  });
});
