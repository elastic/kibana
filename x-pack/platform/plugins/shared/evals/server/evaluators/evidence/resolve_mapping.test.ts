/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEvidenceMapping, EvidenceMappingResolutionError } from './resolve_mapping';

describe('resolveEvidenceMapping', () => {
  it('applies caller overrides with higher precedence than profile defaults', () => {
    const mapping = resolveEvidenceMapping({
      profile: 'otel-genai-events',
      overrides: {
        user_query: {
          fields: {
            content: 'attributes.content',
          },
        },
      },
    });

    expect(mapping.user_query.fields.content).toBe('attributes.content');
    expect(mapping.agent_response.fields.content).toBe('body.structured.message.content');
  });

  it('rejects override field paths outside the allowed prefix set', () => {
    expect(() =>
      resolveEvidenceMapping({
        profile: 'otel-genai-events',
        overrides: {
          user_query: {
            fields: {
              content: '_source.password',
            },
          },
        },
      })
    ).toThrow(EvidenceMappingResolutionError);

    expect(() =>
      resolveEvidenceMapping({
        profile: 'otel-genai-events',
        overrides: {
          user_query: {
            fields: {
              content: '_source.password',
            },
          },
        },
      })
    ).toThrow('Invalid override field path for user_query: _source.password');
  });

  it('resolves elastic-inference to the current Kibana field paths and filters', () => {
    const mapping = resolveEvidenceMapping({ profile: 'elastic-inference' });

    expect(mapping.user_query).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.user.message' }],
      fields: { content: 'attributes.content' },
      select: 'first',
      parse: 'string',
    });

    expect(mapping.agent_response).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.choice' }],
      fields: { content: 'attributes.message.content' },
      select: 'last',
      parse: 'string',
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
      select: 'all',
      parse: 'json',
    });
  });

  it('throws typed error when profile is unknown', () => {
    expect(() => resolveEvidenceMapping({ profile: 'does-not-exist' })).toThrow(
      EvidenceMappingResolutionError
    );
    expect(() => resolveEvidenceMapping({ profile: 'does-not-exist' })).toThrow(
      'Unknown evidence mapping profile: does-not-exist'
    );
  });
});
