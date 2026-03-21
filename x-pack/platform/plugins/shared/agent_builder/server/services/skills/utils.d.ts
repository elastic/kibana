import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { PublicSkillDefinition, PublicSkillSummary } from '@kbn/agent-builder-common';
/**
 * Converts an InternalSkillDefinition to a PublicSkillDefinition
 * suitable for API responses. This is used at the route handler boundary.
 */
export declare const internalToPublicDefinition: (skill: InternalSkillDefinition) => Promise<PublicSkillDefinition>;
/**
 * Converts an InternalSkillDefinition to a PublicSkillSummary for listing.
 * Strips heavy content fields; uses `referencedContentCount` for the count.
 */
export declare const internalToPublicSummary: (skill: InternalSkillDefinition) => Promise<PublicSkillSummary>;
