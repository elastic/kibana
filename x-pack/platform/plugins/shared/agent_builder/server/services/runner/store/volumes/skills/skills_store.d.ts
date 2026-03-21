import type { SkillsStore, WritableSkillsStore } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { MemoryVolume } from '../../filesystem';
export declare const createSkillsStore: ({ skills }: {
    skills: InternalSkillDefinition[];
}) => SkillsStoreImpl;
export declare class SkillsStoreImpl implements WritableSkillsStore {
    private readonly skills;
    private readonly volume;
    constructor({ skills }: {
        skills?: InternalSkillDefinition[];
    });
    getVolume(): MemoryVolume;
    add(skill: InternalSkillDefinition): void;
    /**
     * Delete a skill from the store and the volume. Currently unused.
     * @param skillId - The id of the skill to delete
     * @returns
     */
    delete(skillId: string): boolean;
    has(skillId: string): boolean;
    get(skillId: string): InternalSkillDefinition;
    asReadonly(): SkillsStore;
}
