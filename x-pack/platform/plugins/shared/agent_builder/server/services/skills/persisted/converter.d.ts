import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillPersistedDefinition } from './client';
export declare const convertPersistedSkill: (skill: SkillPersistedDefinition) => InternalSkillDefinition;
