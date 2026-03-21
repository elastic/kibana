import type { PublicSkillDefinition, PublicSkillSummary, PersistedSkillCreateRequest, PersistedSkillUpdateRequest } from '@kbn/agent-builder-common';
export interface ListSkillsResponse {
    results: PublicSkillSummary[];
}
export type GetSkillResponse = PublicSkillDefinition;
export interface DeleteSkillResponse {
    success: boolean;
}
export type CreateSkillPayload = PersistedSkillCreateRequest;
export type UpdateSkillPayload = PersistedSkillUpdateRequest;
export type CreateSkillResponse = PublicSkillDefinition;
export type UpdateSkillResponse = PublicSkillDefinition;
