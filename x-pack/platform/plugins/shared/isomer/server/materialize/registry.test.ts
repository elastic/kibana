/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaterializerRegistry } from './registry';
import type { Materializer } from './types';

const materializer: Materializer<{ text: string }> = {
  version: 1,
  parse: (config) => config as { text: string },
  plan: () => [],
  map: ({ text }) => ({ type: 'markdown', text }),
};

describe('MaterializerRegistry', () => {
  it('returns the materializer registered for a saved object type', () => {
    const registry = new MaterializerRegistry();
    registry.register('markdown', materializer);
    expect(registry.get('markdown')).toBe(materializer);
    expect(registry.has('markdown')).toBe(true);
    expect(registry.types()).toEqual(['markdown']);
  });

  it('returns nothing for a type without a materializer', () => {
    const registry = new MaterializerRegistry();
    expect(registry.get('lens')).toBeUndefined();
    expect(registry.has('lens')).toBe(false);
  });

  it('refuses a second materializer for the same type', () => {
    const registry = new MaterializerRegistry();
    registry.register('markdown', materializer);
    expect(() => registry.register('markdown', materializer)).toThrow(
      'A materializer for saved object type "markdown" is already registered.'
    );
  });
});
