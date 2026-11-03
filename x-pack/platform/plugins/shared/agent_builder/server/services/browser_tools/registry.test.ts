/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtinBrowserToolDescriptors } from '@kbn/agent-builder-common';
import { createBrowserToolDescriptorRegistry, BrowserToolDescriptorRegistry } from './registry';

describe('BrowserToolDescriptorRegistry', () => {
  const descriptor = (id: string) => ({
    ...builtinBrowserToolDescriptors[0],
    id,
  });

  it('register rejects duplicate ids', () => {
    const registry = new BrowserToolDescriptorRegistry();
    registry.register(descriptor('my_tool'));
    expect(() => registry.register(descriptor('my_tool'))).toThrow(/already registered/);
  });

  it('register rejects ids containing dots', () => {
    const registry = new BrowserToolDescriptorRegistry();
    expect(() => registry.register(descriptor('my.tool'))).toThrow(/Invalid browser tool id/);
    expect(() => registry.register(descriptor('my tool'))).toThrow(/Invalid browser tool id/);
  });

  it('registers and exposes descriptors', () => {
    const registry = new BrowserToolDescriptorRegistry();
    registry.register(descriptor('my_tool-1'));
    expect(registry.has('my_tool-1')).toBe(true);
    expect(registry.get('my_tool-1')?.id).toBe('my_tool-1');
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.list()).toHaveLength(1);
  });

  it('createBrowserToolRegistry seeds the builtins', () => {
    const registry = createBrowserToolDescriptorRegistry({ seed: builtinBrowserToolDescriptors });
    expect(registry.list().map((d) => d.id)).toEqual(
      builtinBrowserToolDescriptors.map((d) => d.id)
    );
  });
});
