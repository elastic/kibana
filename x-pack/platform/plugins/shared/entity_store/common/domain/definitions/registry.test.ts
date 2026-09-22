/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from './entity_schema';
import { ALL_ENTITY_TYPES, entitySchema } from './entity_schema';
import {
  getEntityDefinitionWithoutId,
  hasPriorityExtractionGate,
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

const TYPES_WITHOUT_PRIORITY_GATE = ALL_ENTITY_TYPES.filter((type) => type !== 'user');

describe('hasPriorityExtractionGate', () => {
  it('user: returns true', () => {
    expect(hasPriorityExtractionGate('user')).toBe(true);
  });

  it.each(TYPES_WITHOUT_PRIORITY_GATE)('%s: returns false', (type) => {
    expect(hasPriorityExtractionGate(type)).toBe(false);
  });
});

describe('resolveExtractionMode', () => {
  it.each(ALL_ENTITY_TYPES)('%s: returns single when flag is off', (type) => {
    expect(resolveExtractionMode(false, type)).toBe('single');
  });

  it('user: returns priority when flag is on', () => {
    expect(resolveExtractionMode(true, 'user')).toBe('priority');
  });

  it.each(TYPES_WITHOUT_PRIORITY_GATE)(
    '%s: returns single when flag is on and no priority gate is declared',
    (type) => {
      expect(resolveExtractionMode(true, type)).toBe('single');
    }
  );
});

describe('getEntityDefinitionWithoutId', () => {
  it.each(ALL_ENTITY_TYPES)(
    '%s: defaults to single mode, returning the registered definition ungated',
    (type) => {
      expect(getEntityDefinitionWithoutId(type)).toBe(getEntityDefinitionWithoutId(type, 'single'));
      // `extractionGate` is resolved on lookup; the type forbids a definition from authoring one.
      expect(getEntityDefinitionWithoutId(type).extractionGate).toBeUndefined();
    }
  );

  it.each(TYPES_WITHOUT_PRIORITY_GATE)(
    '%s: throws for a process mode rather than silently scanning every document',
    (type) => {
      expect(() => getEntityDefinitionWithoutId(type, 'priority')).toThrow(
        /No priority extraction gate declared/
      );
      expect(() => getEntityDefinitionWithoutId(type, 'nonPriority')).toThrow(
        /No priority extraction gate declared/
      );
    }
  );
});

/**
 * Every mode of a type must share one identity object. `entity.namespace` is part of the entity id,
 * so identity logic that drifted between modes would resolve the same person to a different id per
 * process, splitting one user into two entities.
 */
describe('user extraction modes share identity logic', () => {
  const single = getEntityDefinitionWithoutId('user');
  const priority = getEntityDefinitionWithoutId('user', 'priority');
  const nonPriority = getEntityDefinitionWithoutId('user', 'nonPriority');

  const asRecord = (definition: EntityDefinitionWithoutId) =>
    definition as unknown as Record<string, unknown>;

  /** Compares by reference, so a rebuilt-but-equal value counts as a difference. */
  const keysDifferingFromSingle = (resolved: EntityDefinitionWithoutId): string[] => {
    const keys = new Set([...Object.keys(single), ...Object.keys(resolved)]);
    return [...keys].filter((key) => asRecord(resolved)[key] !== asRecord(single)[key]).sort();
  };

  it.each([
    ['priority', priority],
    ['nonPriority', nonPriority],
  ])('%s is the registered definition with only extractionGate added', (_name, resolved) => {
    expect(keysDifferingFromSingle(resolved)).toEqual(['extractionGate']);
  });

  it.each([
    ['priority', priority],
    ['nonPriority', nonPriority],
  ])('%s reuses the very same identityField object', (_name, resolved) => {
    expect(resolved.identityField).toBe(single.identityField);
  });

  it('gates priority on the declared gate and nonPriority on its complement', () => {
    expect(priority.extractionGate).toBe(single.priorityExtractionGate);
    expect(nonPriority.extractionGate).toEqual({
      or: [{ field: 'event.kind', exists: false }, { not: single.priorityExtractionGate }],
    });
  });
});
