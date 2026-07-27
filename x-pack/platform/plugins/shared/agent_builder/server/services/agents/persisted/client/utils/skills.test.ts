/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillIds } from './skills';
import type { SkillRegistry } from '../../../../skills/skill_registry';

const makeRegistry = (knownIds: string[]): SkillRegistry => {
  const set = new Set(knownIds);
  return {
    has: jest.fn(async (id: string) => set.has(id)),
    bulkGet: jest.fn(async (ids: string[]) => {
      const map = new Map();
      for (const id of ids) {
        if (set.has(id)) map.set(id, { id });
      }
      return map;
    }),
  } as unknown as SkillRegistry;
};

describe('validateSkillIds', () => {
  it('returns no errors when all skill ids exist', async () => {
    const registry = makeRegistry(['skill-a', 'skill-b']);
    const errors = await validateSkillIds(registry, ['skill-a', 'skill-b']);
    expect(errors).toEqual([]);
  });

  it('returns an error for each unknown skill id', async () => {
    const registry = makeRegistry(['skill-a']);
    const errors = await validateSkillIds(registry, ['skill-a', 'skill-x', 'skill-y']);
    expect(errors).toEqual([
      "Skill id 'skill-x' does not exist.",
      "Skill id 'skill-y' does not exist.",
    ]);
  });

  it('returns no errors for an empty list', async () => {
    const registry = makeRegistry([]);
    const errors = await validateSkillIds(registry, []);
    expect(errors).toEqual([]);
  });
});
