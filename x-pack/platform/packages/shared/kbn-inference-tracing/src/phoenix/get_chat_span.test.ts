/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LLM_TOOLS } from '@arizeai/openinference-semantic-conventions';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { GenAISemanticConventions } from '../types';
import { getChatSpan } from './get_chat_span';

describe('getChatSpan', () => {
  it('converts OTel tool definitions to the existing Phoenix tool representation', () => {
    const span = {
      attributes: {
        [GenAISemanticConventions.GenAIToolDefinitions]: JSON.stringify([
          {
            type: 'function',
            name: 'search',
            description: 'Search documents',
            parameters: { type: 'object', properties: { query: { type: 'string' } } },
          },
        ]),
      },
    } as unknown as tracing.ReadableSpan;

    getChatSpan(span);

    expect(JSON.parse(span.attributes[LLM_TOOLS] as string)).toEqual([
      {
        'tool.name': 'search',
        'tool.description': 'Search documents',
        'tool.json_schema': {
          type: 'object',
          properties: { query: { type: 'string' } },
        },
      },
    ]);
  });
});
