import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillsService, WritableSkillsStore } from '@kbn/agent-builder-server/runner';
/**
 * Resolves the set of skills available to an agent based on its configuration:
 * - Explicitly selected skills via `skill_ids` (fetched with bulkGet)
 * - All built-in skills when `enable_elastic_capabilities` is true
 *
 * Populates the writable skills store and returns the merged list.
 */
export declare const selectSkills: ({ skills, skillsStore, agentConfiguration, }: {
    skills: SkillsService;
    skillsStore: WritableSkillsStore;
    agentConfiguration: AgentConfiguration;
}) => Promise<InternalSkillDefinition[]>;
