/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicToolDefinition } from '@kbn/agent-builder-server';
import { formatDynamicToolsNotice, getDynamicToolsInstructions } from './dynamic_tools';

describe('dynamic tools prompt', () => {
  const definitions: DynamicToolDefinition[] = [
    {
      tool_id: 'platform.core.cases',
      description: 'Search cases',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    },
    { tool_id: 'inline-1', description: 'Inline tool', parameters: { type: 'object' } },
  ];

  it('formats the notice as one JSON definition per line inside a <dynamic_tools> block', () => {
    const lines = formatDynamicToolsNotice(definitions).split('\n');

    expect(lines[0]).toBe('<dynamic_tools>');
    expect(lines[1]).toContain('execute_dynamic_tool');
    expect(JSON.parse(lines[2])).toEqual(definitions[0]);
    expect(JSON.parse(lines[3])).toEqual(definitions[1]);
    expect(lines[4]).toBe('</dynamic_tools>');
  });

  it('tells the model where the block appears', () => {
    expect(getDynamicToolsInstructions()).toContain(
      'After a compaction summary, the definitions of every dynamic tool still available are repeated in a <dynamic_tools> block.'
    );
  });
});
