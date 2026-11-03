/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BrowserToolDefinition } from '@kbn/agent-builder-browser/tools/browser_tool';
import { BrowserToolRegistry } from './browser_tool_registry';

const def = (id: string): BrowserToolDefinition<{}> => ({
  id,
  description: 'test tool',
  schema: z.object({}),
  handler: () => {},
});

describe('BrowserToolRegistry', () => {
  it('registers then gets a definition', () => {
    const registry = new BrowserToolRegistry();
    const a = def('a');
    registry.register(a);
    expect(registry.get('a')).toBe(a);
    expect(registry.has('a')).toBe(true);
    expect(registry.list()).toEqual([a]);
  });

  it('throws on duplicate id', () => {
    const registry = new BrowserToolRegistry();
    registry.register(def('a'));
    expect(() => registry.register(def('a'))).toThrow(/already registered/);
  });

  it('removes the definition on unregister', () => {
    const registry = new BrowserToolRegistry();
    const unregister = registry.register(def('a'));
    unregister();
    expect(registry.has('a')).toBe(false);
    expect(registry.get('a')).toBeUndefined();
  });
});
