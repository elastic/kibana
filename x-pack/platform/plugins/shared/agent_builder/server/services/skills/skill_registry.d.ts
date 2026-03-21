import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { type PersistedSkillCreateRequest, type PersistedSkillUpdateRequest } from '@kbn/agent-builder-common';
import type { SkillRegistryListOptions } from '@kbn/agent-builder-server/runner';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';
export interface SkillRegistry {
    has(skillId: string): Promise<boolean>;
    get(skillId: string): Promise<InternalSkillDefinition | undefined>;
    bulkGet(ids: string[]): Promise<Map<string, InternalSkillDefinition>>;
    list(options?: SkillRegistryListOptions): Promise<InternalSkillDefinition[]>;
    create(params: PersistedSkillCreateRequest): Promise<InternalSkillDefinition>;
    update(skillId: string, update: PersistedSkillUpdateRequest): Promise<InternalSkillDefinition>;
    delete(skillId: string): Promise<boolean>;
}
export declare const createSkillRegistry: ({ builtinProvider, persistedProvider, toolRegistry, }: {
    builtinProvider: ReadonlySkillProvider;
    persistedProvider: WritableSkillProvider;
    toolRegistry: ToolRegistry;
}) => SkillRegistry;
