/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { createSkillService } from './skill_service';

const mockPersistedSkillNotFoundError = async () =>
  (
    await vi.importActual<typeof import('@kbn/agent-builder-common')>('@kbn/agent-builder-common')
  ).createSkillNotFoundError({ skillId: 'missing' });

vi.mock('@kbn/agent-builder-server/skills', async () => {
  const actual = await vi.importActual('@kbn/agent-builder-server/skills');
  return {
    ...actual,
    validateSkillDefinition: vi.fn(async (skill) => skill),
  };
});

vi.mock('@kbn/agent-builder-server/allow_lists', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/agent-builder-server/allow_lists')),
    isAllowedSkillRegistration: vi.fn().mockReturnValue(true),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../execution/runner/store/volumes/skills/utils', () => {
  const mocked = {
    getSkillEntryPath: vi.fn(({ skill }) => `${skill.basePath}/${skill.name}/SKILL.md`),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./persisted/client', () => {
  const mocked = {
    createClient: vi.fn(() => ({
      has: vi.fn().mockResolvedValue(false),
      get: vi.fn().mockRejectedValue(mockPersistedSkillNotFoundError()),
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      bulkCreate: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByPluginId: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../utils/spaces', () => {
  const mocked = {
    getCurrentSpaceId: vi.fn().mockReturnValue('default'),
  };
  return { ...mocked, default: mocked };
});

const createMockSkillDefinition = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id: 'test-skill-1',
  name: 'test-skill' as any,
  basePath: 'skills/platform' as any,
  description: 'A test skill',
  content: 'Skill body content',
  getRegistryTools: () => [],
  ...overrides,
});

const createMockToolRegistry = (toolIds: string[] = []): ToolRegistry =>
  ({
    has: vi.fn(async (id: string) => toolIds.includes(id)),
  } as unknown as ToolRegistry);

describe('createSkillService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setup().registerSkill', () => {
    it('registers a skill successfully', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition();
      expect(() => registerSkill(skill)).not.toThrow();
    });

    it('throws when registering a skill id not in the allow-list', async () => {
      const { isAllowedSkillRegistration } = vi.mocked(
        await import('@kbn/agent-builder-server/allow_lists')
      );
      isAllowedSkillRegistration.mockReturnValueOnce(false);

      const service = createSkillService();
      const { registerSkill } = service.setup();

      expect(() => registerSkill(createMockSkillDefinition({ id: 'unlisted-skill' }))).toThrow(
        'Built-in skill with id "unlisted-skill" is not in the list of allowed built-in skills.'
      );
    });

    it('throws when registering duplicate skill id', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      registerSkill(createMockSkillDefinition({ id: 'dup' }));
      expect(() =>
        registerSkill(createMockSkillDefinition({ id: 'dup', name: 'other' as any }))
      ).toThrow('Skill type with id dup already registered');
    });

    it('throws when registering skill with duplicate path and name', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      registerSkill(
        createMockSkillDefinition({ id: 'a', name: 'same' as any, basePath: 'skills/p' as any })
      );
      expect(() =>
        registerSkill(
          createMockSkillDefinition({ id: 'b', name: 'same' as any, basePath: 'skills/p' as any })
        )
      ).toThrow('Skill with path skills/p and name same already registered');
    });

    it('allows different skills with same name but different base paths', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      expect(() =>
        registerSkill(
          createMockSkillDefinition({
            id: 'a',
            name: 'same' as any,
            basePath: 'skills/platform' as any,
          })
        )
      ).not.toThrow();
      expect(() =>
        registerSkill(
          createMockSkillDefinition({
            id: 'b',
            name: 'same' as any,
            basePath: 'skills/security' as any,
          })
        )
      ).not.toThrow();
    });
  });

  describe('start().getRegistry', () => {
    it('returns a registry that includes registered built-in skills', async () => {
      const { createClient: mockCreateClient } = await vi.importMock('./persisted/client/client');
      mockCreateClient.mockReturnValue({
        has: vi.fn().mockResolvedValue(false),
        get: vi.fn().mockRejectedValue(mockPersistedSkillNotFoundError()),
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      });

      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition({ id: 'builtin-1' });
      registerSkill(skill);

      const mockSoClient = { get: vi.fn() } as any;
      const mockUiSettings = {
        asScopedToClient: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(false) }),
        globalAsScopedToClient: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(false) }),
      } as any;
      const mockSavedObjects = { getScopedClient: vi.fn().mockReturnValue(mockSoClient) } as any;

      const { getRegistry } = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: vi.fn() } as any,
        getToolRegistry: vi.fn().mockResolvedValue(mockToolRegistry),
        uiSettings: mockUiSettings,
        savedObjects: mockSavedObjects,
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('builtin-1')).toBe(true);
    });

    const startServiceWithUiSettings = ({
      namespaceGet,
      globalGet,
      skill,
    }: {
      namespaceGet: (key: string) => Promise<unknown>;
      globalGet: (key: string) => Promise<unknown>;
      skill: SkillDefinition;
    }) => {
      const service = createSkillService();
      const { registerSkill } = service.setup();
      registerSkill(skill);

      const mockUiSettings = {
        asScopedToClient: vi.fn().mockReturnValue({ get: vi.fn(namespaceGet) }),
        globalAsScopedToClient: vi.fn().mockReturnValue({ get: vi.fn(globalGet) }),
      } as any;

      return service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: vi.fn() } as any,
        getToolRegistry: vi.fn().mockResolvedValue(createMockToolRegistry()),
        uiSettings: mockUiSettings,
        savedObjects: { getScopedClient: vi.fn().mockReturnValue({}) } as any,
      });
    };

    it('resolves a global-scoped uiSettingRequired via the global settings client', async () => {
      const { getRegistry } = startServiceWithUiSettings({
        // Global settings are not visible to the namespace client.
        namespaceGet: async () => undefined,
        globalGet: async (key) => (key === 'alerting:v2:enabled' ? true : undefined),
        skill: createMockSkillDefinition({
          id: 'global-gated',
          uiSettingRequired: 'alerting:v2:enabled',
        }),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('global-gated')).toBe(true);
    });

    it('hides a skill when its global-scoped uiSettingRequired is not enabled', async () => {
      const { getRegistry } = startServiceWithUiSettings({
        namespaceGet: async () => undefined,
        globalGet: async () => false,
        skill: createMockSkillDefinition({
          id: 'global-gated-off',
          uiSettingRequired: 'alerting:v2:enabled',
        }),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('global-gated-off')).toBe(false);
    });

    it('prefers the namespace-scoped value over the global-scoped value', async () => {
      const { getRegistry } = startServiceWithUiSettings({
        // Namespace value is present and true; global would be false.
        namespaceGet: async (key) => (key === 'my:namespace:setting' ? true : undefined),
        globalGet: async () => false,
        skill: createMockSkillDefinition({
          id: 'namespace-gated',
          uiSettingRequired: 'my:namespace:setting',
        }),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('namespace-gated')).toBe(true);
    });

    it('lets an explicit namespace value (false) override a global value (true)', async () => {
      const { getRegistry } = startServiceWithUiSettings({
        // Namespace explicitly resolves to false; global is true. Namespace wins.
        namespaceGet: async (key) => (key === 'shared:key' ? false : undefined),
        globalGet: async () => true,
        skill: createMockSkillDefinition({
          id: 'shared-key-gated',
          uiSettingRequired: 'shared:key',
        }),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('shared-key-gated')).toBe(false);
    });
  });
});
