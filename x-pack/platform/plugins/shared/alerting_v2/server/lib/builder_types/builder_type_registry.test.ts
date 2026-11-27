/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BUILDER_TYPE_LENGTH } from '@kbn/alerting-v2-schemas';
import { BuilderTypeRegistry } from './builder_type_registry';

describe('BuilderTypeRegistry', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    registry = new BuilderTypeRegistry();
  });

  it('rejects a blank type', () => {
    expect(() => registry.register({ type: ' ' })).toThrow(/non-empty/);
  });

  it('rejects a type longer than the schemas allow', () => {
    const type = 'a'.repeat(MAX_BUILDER_TYPE_LENGTH + 1);

    expect(() => registry.register({ type })).toThrow(/exceeds the maximum length/);
  });

  it('registers a type of the maximum allowed length', () => {
    const type = 'a'.repeat(MAX_BUILDER_TYPE_LENGTH);

    registry.register({ type });

    expect(registry.get(type)).toEqual({ type });
  });

  it('trims the type it stores', () => {
    registry.register({ type: '  custom  ' });

    expect(registry.get('custom')).toEqual({ type: 'custom' });
  });

  it('trims the type it looks up', () => {
    registry.register({ type: 'custom' });

    expect(registry.get('  custom  ')).toEqual({ type: 'custom' });
  });

  it('rejects a duplicate registration', () => {
    registry.register({ type: 'custom' });

    expect(() => registry.register({ type: 'custom' })).toThrow(/already registered/);
  });

  it('rejects a duplicate registration that differs only by surrounding whitespace', () => {
    registry.register({ type: 'custom' });

    expect(() => registry.register({ type: ' custom ' })).toThrow(/already registered/);
  });

  it('returns undefined for a type that was never registered', () => {
    expect(registry.get('custom')).toBeUndefined();
  });
});
