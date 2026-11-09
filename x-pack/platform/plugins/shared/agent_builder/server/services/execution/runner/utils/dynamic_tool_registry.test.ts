/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';
import { DynamicToolRegistry, renderDynamicToolDefinition } from './dynamic_tool_registry';

const createTool = (
  id: string,
  overrides: Partial<ExecutableToolWithOrigin> = {}
): ExecutableToolWithOrigin => ({
  id,
  type: ToolType.builtin,
  origin: ToolOrigin.registry,
  description: `Description of ${id}`,
  tags: [],
  configuration: {},
  readonly: true,
  experimental: false,
  getSchema: () => z.object({}),
  execute: jest.fn(),
  ...overrides,
});

describe('DynamicToolRegistry', () => {
  let registry: DynamicToolRegistry;

  beforeEach(() => {
    registry = new DynamicToolRegistry();
  });

  it('starts empty', () => {
    expect(registry.list()).toEqual([]);
    expect(registry.ids()).toEqual([]);
    expect(registry.has('a')).toBe(false);
    expect(registry.get('a')).toBeUndefined();
  });

  it('registers tools by id', () => {
    const a = createTool('a');
    const b = createTool('b');
    registry.register([a, b]);

    expect(registry.ids()).toEqual(['a', 'b']);
    expect(registry.list()).toEqual([a, b]);
    expect(registry.has('a')).toBe(true);
    expect(registry.get('b')).toBe(b);
  });

  it('replaces an entry when the same id is registered again', () => {
    const first = createTool('a', { description: 'first' });
    const second = createTool('a', { description: 'second' });
    registry.register([first]);
    expect(registry.get('a')).toBe(first);

    registry.register([second]);
    expect(registry.get('a')).toBe(second);
    expect(registry.list()).toHaveLength(1);
  });
});

describe('renderDynamicToolDefinition', () => {
  it('renders the id, description and the input JSON schema', async () => {
    const tool = createTool('platform.core.cases', {
      getSchema: () =>
        z.object({
          query: z.string().describe('The search query'),
          limit: z.number().optional(),
        }),
    });

    const definition = await renderDynamicToolDefinition(tool);

    expect(definition).toEqual({
      tool_id: 'platform.core.cases',
      description: 'Description of platform.core.cases',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
    });
  });

  it('prefers getLlmDescription over description, like native binding', async () => {
    const tool = createTool('a', {
      configuration: { index: 'logs-*' },
      getLlmDescription: ({ description, config }) =>
        `${description} (configured for ${(config as { index: string }).index})`,
    });

    const definition = await renderDynamicToolDefinition(tool);

    expect(definition.description).toBe('Description of a (configured for logs-*)');
  });

  it('awaits an async schema', async () => {
    const tool = createTool('a', {
      getSchema: async () => z.object({ flag: z.boolean() }),
    });

    const definition = await renderDynamicToolDefinition(tool);

    expect(definition.parameters.properties).toEqual({ flag: { type: 'boolean' } });
    expect(definition.parameters.required).toEqual(['flag']);
  });
});
