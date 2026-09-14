/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_ENTITY_TYPES, entitySchema } from './entity_schema';
import {
  getEntityDefinitionWithoutId,
  hasPriorityVariant,
  resolveExtractionMode,
} from './registry';

/**
 * Tests that all entity definitions parse against the entitySchema (does not throw errors)
 */
describe('entitiesDefinitionRegistry', () => {
  it.each(ALL_ENTITY_TYPES)('%s definition parses against entitySchema', (entityType) => {
    const definition = getEntityDefinitionWithoutId(entityType);

    expect(() => entitySchema.parse({ ...definition, id: entityType })).not.toThrow();
  });
});

const TYPES_WITHOUT_PRIORITY_VARIANT = ALL_ENTITY_TYPES.filter((type) => type !== 'user');

describe('hasPriorityVariant', () => {
  it('user: returns true', () => {
    expect(hasPriorityVariant('user')).toBe(true);
  });

  it.each(TYPES_WITHOUT_PRIORITY_VARIANT)('%s: returns false', (type) => {
    expect(hasPriorityVariant(type)).toBe(false);
  });
});

describe('resolveExtractionMode', () => {
  it.each(ALL_ENTITY_TYPES)('%s: returns single when flag is off', (type) => {
    expect(resolveExtractionMode(false, type)).toBe('single');
  });

  it('user: returns priority when flag is on', () => {
    expect(resolveExtractionMode(true, 'user')).toBe('priority');
  });

  it.each(TYPES_WITHOUT_PRIORITY_VARIANT)(
    '%s: returns single when flag is on and no priority variant is registered',
    (type) => {
      expect(resolveExtractionMode(true, type)).toBe('single');
    }
  );
});

describe('getEntityDefinitionWithoutId', () => {
  it.each(ALL_ENTITY_TYPES)('%s: defaults to the single variant, which carries no gate', (type) => {
    expect(getEntityDefinitionWithoutId(type)).toBe(getEntityDefinitionWithoutId(type, 'single'));
    expect(getEntityDefinitionWithoutId(type).extractionGate).toBeUndefined();
  });

  it('throws when a variant is not registered, rather than falling back to single', () => {
    expect(() => getEntityDefinitionWithoutId('host', 'priority')).toThrow(
      /No 'priority' extraction variant registered/
    );
  });
});
