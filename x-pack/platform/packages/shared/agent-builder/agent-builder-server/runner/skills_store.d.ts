import type { InternalSkillDefinition } from '../skills';
/**
 * Store to access skills during execution
 */
export interface SkillsStore {
    has(skillId: string): boolean;
    get(resultId: string): InternalSkillDefinition;
}
/**
 * Writable version of SkillsStore, used internally by the runner/agent
 */
export interface WritableSkillsStore extends SkillsStore {
    add(result: InternalSkillDefinition): void;
    delete(skillId: string): boolean;
    asReadonly(): SkillsStore;
}
