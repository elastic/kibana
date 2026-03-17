/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillPersistedDefinition } from '../services/skills/persisted/client';
import type {
  ReadonlySkillProvider,
  WritableSkillProvider,
} from '../services/skills/skill_provider';

export type ReadonlySkillProviderMock = jest.Mocked<ReadonlySkillProvider>;
export type WritableSkillProviderMock = jest.Mocked<WritableSkillProvider>;

export const createReadonlySkillProviderMock = (): ReadonlySkillProviderMock => {
  return {
    id: 'builtin',
    readonly: true,
    has: jest.fn(),
    get: jest.fn(),
    bulkGet: jest.fn(),
    list: jest.fn(),
  };
};

export const createWritableSkillProviderMock = (): WritableSkillProviderMock => {
  return {
    id: 'persisted',
    readonly: false,
    has: jest.fn(),
    get: jest.fn(),
    bulkGet: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockedInternalSkill = (
  parts: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id: 'test-skill',
  name: 'Test Skill',
  description: 'A test skill',
  content: 'Skill body content',
  readonly: false,
  basePath: '/skills',
  getRegistryTools: () => [],
  referencedContentCount: 0,
  ...parts,
});

export const createMockedPersistedSkillDefinition = (
  parts: Partial<SkillPersistedDefinition> = {}
): SkillPersistedDefinition => ({
  id: 'test-skill',
  name: 'Test Skill',
  description: 'A test skill',
  content: 'Skill body content',
  tool_ids: [],
  created_at: '2024-09-04T06:44:17.944Z',
  updated_at: '2024-09-04T06:44:17.944Z',
  referenced_content_count: 0,
  ...parts,
});
