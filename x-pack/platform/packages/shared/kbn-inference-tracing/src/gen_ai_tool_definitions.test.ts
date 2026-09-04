/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenAiToolDefinitions } from './gen_ai_tool_definitions';

describe('getGenAiToolDefinitions', () => {
  it('converts inference tool maps to OTel tool-definition arrays', () => {
    expect(
      getGenAiToolDefinitions({
        search: {
          description: 'Search documents',
          schema: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        },
      })
    ).toEqual([
      {
        type: 'function',
        name: 'search',
        description: 'Search documents',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
        },
      },
    ]);
  });
});
