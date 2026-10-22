/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { allocateComponentId } from './unit_pipeline';

describe('allocateComponentId', () => {
  it('numbers from 1 by default and marks the id taken', () => {
    const taken = new Set(['add-fields-1']);
    expect(allocateComponentId('add_fields', taken)).toBe('add-fields-2');
    expect(taken.has('add-fields-2')).toBe(true);
  });

  it('tries the bare stem first, then numbers from 2', () => {
    const taken = new Set<string>();
    expect(allocateComponentId('p-otlp', taken, { bareFirst: true })).toBe('p-otlp');
    expect(allocateComponentId('p-otlp', taken, { bareFirst: true })).toBe('p-otlp-2');
  });

  it('keeps long ids within the identifier grammar', () => {
    const stem = `p-${'a'.repeat(300)}`;
    const taken = new Set<string>();
    const bare = allocateComponentId(stem, taken, { bareFirst: true });
    const numbered = allocateComponentId(stem, taken, { bareFirst: true });

    expect(bare).toHaveLength(256);
    expect(numbered).toHaveLength(256);
    expect(numbered.endsWith('-2')).toBe(true);
    expect(streamsUnitIdentifierSchema.safeParse(numbered).success).toBe(true);
  });

  it('falls back to a generic stem when nothing usable is left', () => {
    expect(allocateComponentId('___', new Set())).toBe('component-1');
  });
});
