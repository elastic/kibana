/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEvidenceMapping } from './resolve_mapping';

describe('getEvidenceMapping', () => {
  it('resolves elastic-inference to the current Kibana field paths and filters', () => {
    const mapping = getEvidenceMapping('elastic-inference');

    expect(mapping.user_query).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.user.message' }],
      contentField: 'attributes.content',
      select: 'first',
      parse: 'string',
    });

    expect(mapping.agent_response).toEqual({
      source: 'logs',
      filter: [{ field: 'event_name', value: 'gen_ai.choice' }],
      contentField: 'attributes.message.content',
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
    });
  });

  it('throws when profile is unknown', () => {
    expect(() => getEvidenceMapping('does-not-exist')).toThrow(
      'Unknown evidence mapping profile: does-not-exist'
    );
  });
});
