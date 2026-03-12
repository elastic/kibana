/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReadonlySkillProvider, WritableSkillProvider, SkillProvider } from './skill_provider';
import { isReadonlySkillProvider, isWritableSkillProvider } from './skill_provider';

describe('skill_provider type guards', () => {
  const createReadonlyProvider = (): ReadonlySkillProvider => ({
    id: 'builtin',
    readonly: true,
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  });

  const createWritableProvider = (): WritableSkillProvider => ({
    id: 'persisted',
    readonly: false,
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  describe('isReadonlySkillProvider', () => {
    it('returns true for a readonly provider', () => {
      const provider: SkillProvider = createReadonlyProvider();
      expect(isReadonlySkillProvider(provider)).toBe(true);
    });

    it('returns false for a writable provider', () => {
      const provider: SkillProvider = createWritableProvider();
      expect(isReadonlySkillProvider(provider)).toBe(false);
    });
  });

  describe('isWritableSkillProvider', () => {
    it('returns true for a writable provider', () => {
      const provider: SkillProvider = createWritableProvider();
      expect(isWritableSkillProvider(provider)).toBe(true);
    });

    it('returns false for a readonly provider', () => {
      const provider: SkillProvider = createReadonlyProvider();
      expect(isWritableSkillProvider(provider)).toBe(false);
    });
  });
});
