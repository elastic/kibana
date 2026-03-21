import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ReadonlySkillProvider } from '../skill_provider';
export declare const createBuiltinSkillProvider: (skills: SkillDefinition[]) => ReadonlySkillProvider;
