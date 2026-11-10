/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';
import { DynamicToolRegistry } from './dynamic_tool_registry';

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
