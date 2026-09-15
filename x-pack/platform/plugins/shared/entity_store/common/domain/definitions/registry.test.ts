/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from './entity_schema';
import { ALL_ENTITY_TYPES, entitySchema, EXTRACTION_MODE } from './entity_schema';
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
    expect(resolveExtractionMode(false, type)).toBe(EXTRACTION_MODE.single);
  });

  it('user: returns priority when flag is on', () => {
    expect(resolveExtractionMode(true, 'user')).toBe(EXTRACTION_MODE.priority);
  });

  it.each(TYPES_WITHOUT_PRIORITY_VARIANT)(
    '%s: returns single when flag is on and no priority variant is registered',
    (type) => {
      expect(resolveExtractionMode(true, type)).toBe(EXTRACTION_MODE.single);
    }
  );
});

describe('getEntityDefinitionWithoutId', () => {
  it.each(ALL_ENTITY_TYPES)('%s: defaults to the single variant, which carries no gate', (type) => {
    expect(getEntityDefinitionWithoutId(type)).toBe(
      getEntityDefinitionWithoutId(type, EXTRACTION_MODE.single)
    );
    expect(getEntityDefinitionWithoutId(type).extractionGate).toBeUndefined();
  });

  it('throws when a variant is not registered, rather than falling back to single', () => {
    expect(() => getEntityDefinitionWithoutId('host', EXTRACTION_MODE.priority)).toThrow(
      /No 'priority' extraction variant registered/
    );
  });
});

/**
 * Every variant of a type must share one identity object. `entity.namespace` is part of the entity
 * id, so identity logic that drifted between variants would resolve the same person to a different
 * id per process, splitting one user into two entities.
 */
describe('user extraction variants share identity logic', () => {
  const single = getEntityDefinitionWithoutId('user');
  const priority = getEntityDefinitionWithoutId('user', EXTRACTION_MODE.priority);
  const nonPriority = getEntityDefinitionWithoutId('user', EXTRACTION_MODE.nonPriority);

  const asRecord = (definition: EntityDefinitionWithoutId) =>
    definition as unknown as Record<string, unknown>;

  /** Compares by reference, so a rebuilt-but-equal value counts as a difference. */
  const keysDifferingFromSingle = (variant: EntityDefinitionWithoutId): string[] => {
    const keys = new Set([...Object.keys(single), ...Object.keys(variant)]);
    return [...keys].filter((key) => asRecord(variant)[key] !== asRecord(single)[key]).sort();
  };

  it.each([
    [EXTRACTION_MODE.priority, priority],
    [EXTRACTION_MODE.nonPriority, nonPriority],
  ])('%s is the single definition with only extractionGate replaced', (_name, variant) => {
    expect(keysDifferingFromSingle(variant)).toEqual(['extractionGate']);
  });

  it.each([
    [EXTRACTION_MODE.priority, priority],
    [EXTRACTION_MODE.nonPriority, nonPriority],
  ])('%s reuses the very same identityField object', (_name, variant) => {
    expect(variant.identityField).toBe(single.identityField);
  });

  it('gives each variant a distinct gate', () => {
    expect(priority.extractionGate).toBeDefined();
    expect(nonPriority.extractionGate).toBeDefined();
    expect(priority.extractionGate).not.toEqual(nonPriority.extractionGate);
  });
});
